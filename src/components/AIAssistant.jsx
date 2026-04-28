import { useState } from 'react';

const AIAssistant = ({ newsList }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const toggleAssistant = () => {
    setIsOpen(!isOpen);
  };

  const handleAiQuery = () => {
    if (!aiQuery.trim()) return;
    
    setIsLoading(true);
    
    // 模拟AI响应
    setTimeout(() => {
      const responses = [
        `根据您的查询"${aiQuery}"，我为您找到了相关的教育时政新闻：\n1. 教育部发布2026年全国教育工作会议精神解读\n2. 2026年高考改革方案正式公布\n3. 国家智慧教育平台2.0版正式上线\n\n您可以在主页面查看详细内容。`,
        `关于"${aiQuery}"的相关信息：\n教育政策是国家为了发展教育事业而制定的方针、政策和措施的总称。近年来，我国教育政策不断完善，包括深化教育评价改革、推进义务教育优质均衡发展、加强教师队伍建设等方面。\n\n建议您关注教育部官网发布的最新政策文件。`,
        `针对"${aiQuery}"，我为您提供以下信息：\n1. 教育时政新闻通常包括政策法规、考试招生、教育管理、教育技术等方面的内容\n2. 您可以通过搜索功能查找特定主题的新闻\n3. 卡片里会区分“已核原文”和“整理摘要”，只有已核验的卡片才会提供原文直链\n\n希望这些信息对您有所帮助！`
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      setAiResponse(randomResponse);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div>
      {/* 悬浮的AI助手按钮 */}
      <button
        onClick={toggleAssistant}
        style={{
          position: 'fixed',
          left: '20px',
          bottom: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #c41e3a, #8b0000)',
          color: 'white',
          border: 'none',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        🤖
      </button>

      {/* AI助手悬浮框 */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          left: '90px',
          bottom: '20px',
          width: '300px',
          background: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          zIndex: 999,
          overflow: 'hidden'
        }}>
          {/* 头部 */}
          <div style={{
            background: 'linear-gradient(135deg, #c41e3a, #8b0000)',
            color: 'white',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🤖</span>
              <span style={{ fontWeight: 'bold' }}>智能助手</span>
            </div>
            <button
              onClick={toggleAssistant}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer'
              }}
            >
              ×
            </button>
          </div>

          {/* 内容区 */}
          <div style={{ padding: '16px' }}>
            {/* 响应区域 */}
            {aiResponse && (
              <div style={{
                background: '#f9f9f9',
                padding: '12px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '14px',
                lineHeight: 1.5,
                maxHeight: '200px',
                overflowY: 'auto'
              }}>
                {aiResponse.split('\n').map((line, index) => (
                  <p key={index} style={{ margin: '4px 0' }}>{line}</p>
                ))}
              </div>
            )}

            {isLoading && (
              <div style={{
                padding: '12px',
                textAlign: 'center',
                color: '#666',
                marginBottom: '16px'
              }}>
                思考中...
              </div>
            )}

            {/* 输入区域 */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="输入您的问题..."
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAiQuery();
                  }
                }}
              />
              <button
                onClick={handleAiQuery}
                style={{
                  padding: '8px 16px',
                  background: '#c41e3a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                发送
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
