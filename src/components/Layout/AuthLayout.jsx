// components/Layout/AuthLayout.jsx
export default function AuthLayout({ children, title, subtitle }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* 品牌标识 */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">AI项目平台</h1>
          <p className="text-gray-600 mt-2">探索人工智能的无限可能</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="md:flex">
            {/* 左侧面板 - 使用您的品牌渐变 */}
            <div className="md:w-1/2 bg-gradient-to-br from-brand-blue to-brand-purple text-white p-12">
              <div className="mb-8">
                <div className="flex items-center text-2xl font-bold mb-4">
                  <span className="mr-2">🚀</span>
                  AI项目平台
                </div>
                <h2 className="text-xl font-semibold mb-2">欢迎使用AI项目</h2>
                <p className="text-blue-100">登录以访问强大的AI功能和特性，提升您的工作效率。</p>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex items-center">
                  <span className="text-green-300 mr-3">✅</span>
                  <span>数据分析功能</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-300 mr-3">✅</span>
                  <span>实时处理能力</span>
                </div>
                <div className="flex items-center">
                  <span className="text-green-300 mr-3">✅</span>
                  <span>企业级安全保障</span>
                </div>
              </div>

              <div className="border-t border-blue-400 pt-6">
                <p className="text-blue-200">体验人工智能带来的变革力量，让复杂任务变得简单高效。</p>
              </div>
            </div>

            {/* 右侧面板 - 表单区域 */}
            <div className="md:w-1/2 p-12">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-gray-800">{title}</h2>
                {subtitle && <p className="text-gray-600 mt-2">{subtitle}</p>}
              </div>
              
              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}