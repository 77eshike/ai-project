import { useState } from 'react';
import styles from '../styles/login.module.css';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if(email && password) {
      // 这里通常会发送AJAX请求到服务器进行验证
      alert('登录请求已提交！');
      // 在实际应用中，这里会进行登录验证和页面跳转
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <div className={styles.logo}>
          <i className={`fas fa-brain ${styles.logoIcon}`}></i>
          AI项目平台
        </div>
        <div className={styles.welcome}>
          <h2>欢迎使用AI项目</h2>
          <p>登录以访问强大的AI功能和特性，提升您的工作效率。</p>
        </div>
        <ul className={styles.features}>
          <li className={styles.featureItem}>
            <i className={`fas fa-robot ${styles.featureIcon}`}></i> 
            先进的AI模型
          </li>
          <li className={styles.featureItem}>
            <i className={`fas fa-chart-line ${styles.featureIcon}`}></i> 
            数据分析功能
          </li>
          <li className={styles.featureItem}>
            <i className={`fas fa-bolt ${styles.featureIcon}`}></i> 
            实时处理能力
          </li>
          <li className={styles.featureItem}>
            <i className={`fas fa-shield-alt ${styles.featureIcon}`}></i> 
            企业级安全保障
          </li>
        </ul>
        <div className={styles.divider}></div>
        <p>体验人工智能带来的变革力量，让复杂任务变得简单高效。</p>
      </div>
      
      <div className={styles.rightPanel}>
        <div className={styles.loginHeader}>
          <h2>登录您的账户</h2>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label htmlFor="email">电子邮箱</label>
            <input 
              type="email" 
              id="email" 
              className={styles.formInput}
              placeholder="请输入您的邮箱" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="password">密码</label>
            <input 
              type="password" 
              id="password" 
              className={styles.formInput}
              placeholder="请输入您的密码" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <div className={styles.options}>
            <div className={styles.remember}>
              <input 
                type="checkbox" 
                id="remember" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember">记住我</label>
            </div>
            <a href="#" className={styles.forgotPassword}>忘记密码？</a>
          </div>
          
          <button type="submit" className={styles.loginBtn}>登录</button>
        </form>
        
        <div className={styles.dividerText}>或使用以下方式登录</div>
        
        <div className={styles.socialLogin}>
          <div className={styles.socialBtn}>
            <i className="fab fa-google"></i>
          </div>
          <div className={styles.socialBtn}>
            <i className="fab fa-facebook-f"></i>
          </div>
          <div className={styles.socialBtn}>
            <i className="fab fa-linkedin-in"></i>
          </div>
          <div className={styles.socialBtn}>
            <i className="fab fa-twitter"></i>
          </div>
        </div>
        
        <div className={styles.register}>
          <p>还没有账户？<a href="#" className={styles.registerLink}>立即注册</a></p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;