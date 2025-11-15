// 新增：src/components/ProjectDiscussion.js
import React, { useState, useEffect } from 'react';

const ProjectDiscussion = ({ projectId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);

  // 加载评论
  const loadComments = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/comments`);
      const result = await response.json();
      
      if (result.success) {
        setComments(result.data.comments || []);
      }
    } catch (error) {
      console.error('加载评论失败:', error);
    }
  };

  // 发表评论
  const handleSubmitComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          parentId: replyingTo
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setNewComment('');
        setReplyingTo(null);
        await loadComments(); // 重新加载评论
      }
    } catch (error) {
      console.error('发表评论失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      loadComments();
    }
  }, [projectId]);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 讨论区头部 */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">讨论区</h3>
        <p className="text-sm text-gray-600 mt-1">
          与团队成员讨论项目细节，提供反馈和建议
        </p>
      </div>

      {/* 评论列表 */}
      <div className="p-6 space-y-6 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💬</div>
            <p>暂无讨论</p>
            <p className="text-sm mt-1">成为第一个发表评论的人</p>
          </div>
        ) : (
          comments.map(comment => (
            <CommentItem 
              key={comment.id} 
              comment={comment} 
              onReply={setReplyingTo}
            />
          ))
        )}
      </div>

      {/* 评论输入框 */}
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <form onSubmit={handleSubmitComment} className="space-y-3">
          {replyingTo && (
            <div className="flex items-center justify-between text-sm bg-blue-50 px-3 py-2 rounded">
              <span className="text-blue-700">回复评论...</span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                className="text-blue-600 hover:text-blue-800"
              >
                取消
              </button>
            </div>
          )}
          
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="输入您的评论或建议..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="3"
            disabled={loading}
          />
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              评论将帮助完善项目方案
            </span>
            <button
              type="submit"
              disabled={!newComment.trim() || loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '发表中...' : '发表评论'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 评论项组件
const CommentItem = ({ comment, onReply }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 text-sm font-medium">
              {comment.user?.name?.charAt(0) || 'U'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              {comment.user?.name || '匿名用户'}
            </p>
            <p className="text-xs text-gray-500">
              {new Date(comment.createdAt).toLocaleString('zh-CN')}
            </p>
          </div>
        </div>
        
        <button
          onClick={() => onReply(comment.id)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          回复
        </button>
      </div>
      
      <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
      
      {/* 回复列表 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 ml-6 space-y-3 border-l-2 border-gray-200 pl-4">
          {comment.replies.map(reply => (
            <div key={reply.id} className="border border-gray-100 rounded p-3 bg-gray-50">
              <div className="flex items-center space-x-2 mb-1">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs font-medium">
                    {reply.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-900">
                  {reply.user?.name || '匿名用户'}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(reply.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>
              <p className="text-sm text-gray-700">{reply.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProjectDiscussion;