export default function SettingsTab({ user, isLoggingOut, handleLogout, voiceEnabled, toggleVoice }) {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">用户设置</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{user.name}</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">邮箱地址</label>
          <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded">{user.email}</p>
        </div>
        
        {/* 语音设置 */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-gray-900">语音播报</h4>
              <p className="text-sm text-gray-500">AI回复时使用语音播报</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={voiceEnabled}
                onChange={(e) => toggleVoice(e.target.checked)}
              />
              <div className={`w-11 h-6 bg-gray-200 rounded-full transition-colors ${voiceEnabled ? 'bg-blue-600' : ''}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${voiceEnabled ? 'transform translate-x-5' : ''}`}></div>
            </label>
          </div>
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="bg-gradient-to-r from-red-500 to-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200 hover:from-red-600 hover:to-red-800 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isLoggingOut ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                登出中
              </>
            ) : (
              <>
                <i className="fas fa-sign-out-alt mr-2"></i>
                注销账户
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}