import axios from "axios";
import formidable from "formidable";
import fs from "fs";
import path from "path";

export const config = {
  api: {
    bodyParser: false, // 禁用默认的 bodyParser
  },
};

// 增强的日志系统
const createLogger = (context) => ({
  info: (...args) => console.log(`[BaiduSpeech][${context}]`, ...args),
  error: (...args) => console.error(`[BaiduSpeech][${context}]`, ...args),
  warn: (...args) => console.warn(`[BaiduSpeech][${context}]`, ...args),
  debug: (...args) => process.env.NODE_ENV !== "production" && console.log(`[BaiduSpeech][${context}]`, ...args)
});

// 音频数据验证函数
const validateAudioData = (buffer, logger) => {
  if (!buffer || buffer.length === 0) {
    throw new Error("空的音频数据");
  }

  const minSize = 16000 * 0.5 * 2;
  if (buffer.length < minSize) {
    throw new Error(`音频太短: ${buffer.length} bytes, 需要至少${minSize} bytes`);
  }

  const maxSize = 16000 * 60 * 2;
  if (buffer.length > maxSize) {
    throw new Error(`音频太长: ${buffer.length} bytes, 请限制在${maxSize} bytes以内`);
  }

  logger.info(`音频验证通过: ${buffer.length} bytes`);
  return true;
};

// 提取PCM数据函数
const extractPCMData = (buffer, logger) => {
  try {
    const isWav = buffer.length >= 44 && 
                  buffer[0] === 0x52 && 
                  buffer[1] === 0x49 && 
                  buffer[2] === 0x46 && 
                  buffer[3] === 0x46;

    if (!isWav) {
      logger.debug("不是WAV格式，直接返回原始数据");
      return buffer;
    }

    logger.debug("检测到WAV格式，提取PCM数据");
    
    const dataSize = buffer.readUInt32LE(40);
    const pcmStart = 44;
    
    if (pcmStart + dataSize > buffer.length) {
      logger.warn("WAV文件头声明的大小超过实际数据，使用实际数据长度");
      return buffer.slice(pcmStart);
    }

    const pcmBuffer = buffer.slice(pcmStart, pcmStart + dataSize);
    logger.debug(`WAV文件处理: 头长度=44, PCM数据长度=${pcmBuffer.length}`);
    
    return pcmBuffer;

  } catch (error) {
    logger.error("PCM数据提取失败:", error.message);
    return buffer;
  }
};

// 使用 formidable 解析 FormData
const parseForm = (req) => {
  return new Promise((resolve, reject) => {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
      multiples: false,
    });

    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }
      resolve({ fields, files });
    });
  });
};

export default async function handler(req, res) {
  const logger = createLogger(`REQ-${Date.now()}`);
  
  if (req.method !== "POST") {
    logger.error(`方法不允许: ${req.method}`);
    return res.status(405).json({ 
      error: "Method not allowed",
      allowed: ["POST"]
    });
  }

  // 立即设置响应头
  res.setHeader('Content-Type', 'application/json');

  try {
    logger.info("开始处理语音识别请求 - FormData版本");

    // -------------------------------
    // 1️⃣ 使用 formidable 解析 FormData
    // -------------------------------
    logger.debug("解析 FormData...");
    
    const { fields, files } = await parseForm(req);
    
    logger.debug("FormData 解析结果:", {
      fields: Object.keys(fields),
      files: Object.keys(files)
    });
    
    if (!files.audio || !files.audio[0]) {
      logger.error("未收到音频文件");
      throw new Error("未收到音频文件");
    }

    const audioFile = files.audio[0];
    logger.info(`收到音频文件: ${audioFile.size} bytes, ${audioFile.mimetype}, 路径: ${audioFile.filepath}`);

    // 读取文件内容
    const audioBuffer = fs.readFileSync(audioFile.filepath);
    
    if (!audioBuffer || audioBuffer.length === 0) {
      throw new Error("音频文件读取失败");
    }

    logger.info(`读取音频文件成功: ${audioBuffer.length} bytes`);

    // 验证音频数据
    validateAudioData(audioBuffer, logger);

    // -------------------------------
    // 2️⃣ 处理音频数据
    // -------------------------------
    logger.debug("处理音频格式...");
    const pcmBuffer = extractPCMData(audioBuffer, logger);
    
    if (!pcmBuffer || pcmBuffer.length === 0) {
      throw new Error("PCM数据提取失败");
    }

    logger.debug(`PCM数据长度: ${pcmBuffer.length} bytes`);

    // -------------------------------
    // 3️⃣ 获取百度 Token
    // -------------------------------
    logger.debug("获取百度Token...");
    
    const tokenUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3001"}/api/baidu-token`;
    
    let tokenResponse;
    try {
      tokenResponse = await fetch(tokenUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!tokenResponse.ok) {
        throw new Error(`Token API 响应异常: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      
      if (!tokenData.token) {
        throw new Error("无效的Token响应");
      }

      logger.debug(`获取Token成功: ${tokenData.token.substring(0, 20)}...`);
    } catch (tokenError) {
      logger.error("获取百度Token失败:", tokenError.message);
      throw new Error(`Token获取失败: ${tokenError.message}`);
    }

    const tokenData = await tokenResponse.json();
    const token = tokenData.token;

    if (!token) {
      throw new Error("无法获取有效的百度Token");
    }

    // -------------------------------
    // 4️⃣ 准备百度API请求
    // -------------------------------
    const audioBase64 = pcmBuffer.toString('base64');
    
    const actualDuration = pcmBuffer.length / (16000 * 2);
    
    const requestData = {
      format: "pcm",
      rate: 16000,
      channel: 1,
      token: token,
      cuid: `web_app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      len: pcmBuffer.length,
      speech: audioBase64,
      dev_pid: 1537,
    };

    logger.debug("发送百度语音识别请求", {
      dataLength: audioBase64.length,
      pcmLength: pcmBuffer.length,
      duration: `${actualDuration.toFixed(2)}s`
    });

    // -------------------------------
    // 5️⃣ 调用百度语音API
    // -------------------------------
    let baiduResponse;
    try {
      baiduResponse = await axios.post("https://vop.baidu.com/server_api", requestData, {
        headers: { 
          "Content-Type": "application/json",
          "User-Agent": "AI-Chat-App/1.0"
        },
        timeout: 15000,
      });
    } catch (apiError) {
      logger.error("百度API调用失败:", apiError.message);

      if (apiError.code === 'ECONNABORTED') {
        throw new Error("百度语音识别服务响应超时");
      } else if (apiError.response?.data) {
        const baiduError = apiError.response.data;
        throw new Error(`百度服务错误: ${baiduError.err_msg || JSON.stringify(baiduError)}`);
      } else {
        throw new Error(`语音识别服务暂时不可用: ${apiError.message}`);
      }
    }

    const resultData = baiduResponse?.data || {};
    logger.info("百度API响应:", {
      err_no: resultData.err_no,
      err_msg: resultData.err_msg
    });

    // -------------------------------
    // 6️⃣ 处理响应结果
    // -------------------------------
    if (resultData.err_no === 0) {
      const recognizedText = resultData.result?.[0] || "";
      
      logger.info("语音识别成功", {
        textLength: recognizedText.length,
        text: recognizedText.substring(0, 100)
      });

      // 清理临时文件
      try {
        fs.unlinkSync(audioFile.filepath);
        logger.debug("临时文件清理成功");
      } catch (cleanupError) {
        logger.warn("清理临时文件失败:", cleanupError.message);
      }

      return res.status(200).json({
        success: true,
        result: recognizedText,
        text: recognizedText,
        audioInfo: {
          duration: `${actualDuration.toFixed(2)}s`,
          size: pcmBuffer.length,
          format: 'pcm'
        }
      });
    } else {
      const errorMap = {
        3300: "音频参数错误，请检查采样率和格式",
        3301: "音频质量过低，无法识别",
        3302: "音频认证失败",
        3304: "请求频率过高，请稍后重试",
        3305: "音频解码失败",
        3307: "识别超时，请重试",
        3308: "音频过短，请录制至少1秒语音",
        3309: "音频数据异常",
        3310: "音频过长，请限制在60秒以内",
        3311: "服务不可用",
        3312: "发音不清，请重新录制",
      };

      const friendlyMessage = errorMap[resultData.err_no] || 
                             `识别失败 (错误码: ${resultData.err_no})`;

      logger.warn("百度API返回错误", {
        err_no: resultData.err_no,
        err_msg: resultData.err_msg,
        friendlyMessage
      });

      // 清理临时文件
      try {
        fs.unlinkSync(audioFile.filepath);
        logger.debug("临时文件清理成功");
      } catch (cleanupError) {
        logger.warn("清理临时文件失败:", cleanupError.message);
      }

      return res.status(400).json({
        success: false,
        error: friendlyMessage,
        detail: resultData.err_msg,
        err_no: resultData.err_no
      });
    }

  } catch (error) {
    logger.error("语音识别处理失败:", error.message);
    
    let statusCode = 500;
    let errorMessage = "语音识别服务暂时不可用";
    
    if (error.message.includes("音频数据") || error.message.includes("WAV文件") || error.message.includes("未收到音频文件")) {
      statusCode = 400;
      errorMessage = error.message;
    } else if (error.message.includes("Token")) {
      statusCode = 502;
      errorMessage = "语音认证服务不可用";
    } else if (error.message.includes("百度服务错误")) {
      statusCode = 400;
      errorMessage = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      message: error.message
    });
  }
}