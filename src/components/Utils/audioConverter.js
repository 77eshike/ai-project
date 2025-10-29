// src/components/Utils/audioConverter.js
class AudioConverter {
  static async webmToWav(webmBlob) {
    return new Promise((resolve, reject) => {
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const fileReader = new FileReader();
        
        fileReader.onload = async function() {
          try {
            const arrayBuffer = this.result;
            
            // 解码WebM音频
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // 创建WAV格式
            const wavBuffer = AudioConverter.encodeWav(audioBuffer);
            const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
            
            resolve(wavBlob);
          } catch (error) {
            reject(new Error(`音频解码失败: ${error.message}`));
          }
        };
        
        fileReader.onerror = () => {
          reject(new Error('文件读取失败'));
        };
        
        fileReader.readAsArrayBuffer(webmBlob);
      } catch (error) {
        reject(new Error(`音频转换失败: ${error.message}`));
      }
    });
  }

  static encodeWav(audioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const sampleRate = audioBuffer.sampleRate;
    const length = audioBuffer.length * numberOfChannels * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channelData = [];
    let offset = 0;
    let pos = 0;

    // 获取通道数据
    for (let i = 0; i < numberOfChannels; i++) {
      channelData.push(audioBuffer.getChannelData(i));
    }

    // WAV文件头
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length = 16
    setUint16(1); // PCM (uncompressed)
    setUint16(numberOfChannels);
    setUint32(sampleRate);
    setUint32(sampleRate * 2 * numberOfChannels); // avg. bytes/sec
    setUint16(numberOfChannels * 2); // block-align
    setUint16(16); // 16-bit

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    // 写入PCM数据
    for (let i = 0; i < audioBuffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channelData[channel][i]));
        view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        pos += 2;
      }
    }

    function setUint16(data) {
      view.setUint16(pos, data, true);
      pos += 2;
    }

    function setUint32(data) {
      view.setUint32(pos, data, true);
      pos += 4;
    }

    return buffer;
  }

  // 简单的格式检测
  static detectAudioFormat(uint8Array) {
    const header = uint8Array.slice(0, 8);
    
    // WebM 格式检测
    if (header[0] === 0x1A && header[1] === 0x45 && header[2] === 0xDF && header[3] === 0xA3) {
      return 'WebM';
    }
    
    // WAV 格式检测 (RIFF header)
    if (header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46) {
      return 'WAV';
    }
    
    // Ogg 格式检测
    if (header[0] === 0x4F && header[1] === 0x67 && header[2] === 0x67 && header[3] === 0x53) {
      return 'Ogg';
    }
    
    return '未知格式';
  }
}

export default AudioConverter;