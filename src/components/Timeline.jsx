import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { askDoubao, buildLocalAnswer, hasDoubaoConfig } from '../lib/doubao';
import { importCardFromUrl, normalizeUrl } from '../lib/cardImport';
import { findDuplicateCard, formatDuplicateMessage } from '../lib/cardDuplicate';
import FloatingSidebarPanel from './FloatingSidebarPanel';
import AddCardModal from './AddCardModal';

const StrokeIcon = ({ children, size = 22, color = 'currentColor', fill = 'none' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: 'block', flexShrink: 0 }}
  >
    {children}
  </svg>
);

const SparkleIcon = ({ color = '#2563eb' }) => (
  <StrokeIcon size={24} color={color}>
    <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3z" />
  </StrokeIcon>
);

const BookmarkIcon = ({ color = '#d97706' }) => (
  <StrokeIcon size={24} color={color}>
    <path d="M6 4h12v16l-6-4-6 4z" />
  </StrokeIcon>
);

const PlusIcon = ({ color = '#16a34a' }) => (
  <StrokeIcon size={24} color={color}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </StrokeIcon>
);

const StackIcon = ({ color = '#7c3aed' }) => (
  <StrokeIcon size={24} color={color}>
    <path d="M12 4l8 4-8 4-8-4 8-4z" />
    <path d="M4 12l8 4 8-4" />
    <path d="M4 16l8 4 8-4" />
  </StrokeIcon>
);

const Timeline = ({ newsList, onAddCard, savedNews, onSaveNews, onRemoveSavedNews, onChangeHomeListMode, onDeleteCard, isMobile }) => {
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [newCard, setNewCard] = useState({
    title: '',
    content: '',
    summary: '',
    detailContent: '',
    date: new Date().toISOString().split('T')[0],
    sourceUrl: '',
    category: '自定义'
  });
  const [isImportingCard, setIsImportingCard] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [lastImportedUrl, setLastImportedUrl] = useState('');
  const [duplicateNews, setDuplicateNews] = useState(null);
  const importingCardRef = useRef(false);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'saved'
  const [aiMessages, setAiMessages] = useState([]);
  const [aiQuery, setAiQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const isDoubaoReady = hasDoubaoConfig();

  const handleAddCard = () => {
    setIsAddingCard(true);
    setImportStatus('');
    setDuplicateNews(null);
  };

  const handleSaveCard = () => {
    if (newCard.title) {
      if (onAddCard) {
        const result = onAddCard({
          ...newCard,
          content: newCard.summary || newCard.content,
          summary: newCard.summary || newCard.content,
          detailContent: newCard.detailContent || newCard.content
        });

        if (result?.ok === false && result.duplicateCard) {
          setDuplicateNews(result.duplicateCard);
          setImportStatus(formatDuplicateMessage({ card: result.duplicateCard, reason: result.duplicateReason }));
          return;
        }
      }
      setNewCard({
        title: '',
        content: '',
        summary: '',
        detailContent: '',
        date: new Date().toISOString().split('T')[0],
        sourceUrl: '',
        category: '自定义'
      });
      setImportStatus('');
      setLastImportedUrl('');
      setDuplicateNews(null);
      setIsAddingCard(false);
    }
  };

  const handleImportCard = async (force = false) => {
    if (importingCardRef.current) {
      return;
    }

    const normalizedUrl = normalizeUrl(newCard.sourceUrl);
    if (!normalizedUrl) {
      setImportStatus('请输入可用链接');
      setDuplicateNews(null);
      return;
    }

    const existingNewsByUrl = findDuplicateCard(newsList, { sourceUrl: normalizedUrl });
    if (existingNewsByUrl) {
      setDuplicateNews(existingNewsByUrl.card);
      setImportStatus(formatDuplicateMessage(existingNewsByUrl));
      return;
    }

    if (!force && normalizedUrl === lastImportedUrl) {
      return;
    }

    setDuplicateNews(null);
    importingCardRef.current = true;
    setIsImportingCard(true);
    setImportStatus('正在抓取原文...');

    try {
      const importedCard = await importCardFromUrl(normalizedUrl);
      const duplicateResult = findDuplicateCard(newsList, importedCard);
      if (duplicateResult) {
        setDuplicateNews(duplicateResult.card);
        setImportStatus(formatDuplicateMessage(duplicateResult));
        return;
      }

      setNewCard((prev) => ({
        ...prev,
        title: importedCard.title || prev.title,
        date: importedCard.date || prev.date,
        sourceUrl: importedCard.sourceUrl || prev.sourceUrl,
        content: importedCard.summary || prev.content,
        summary: importedCard.summary || prev.summary || prev.content,
        detailContent: importedCard.detailContent || prev.detailContent
      }));
      setLastImportedUrl(normalizedUrl);
      setImportStatus('已抓取正文，可继续修改后保存');
    } catch (error) {
      console.error('抓取卡片失败:', error);
      setImportStatus(error.message || '抓取失败，请手动补充内容');
    } finally {
      importingCardRef.current = false;
      setIsImportingCard(false);
    }
  };

  const handleAiQuery = async () => {
    if (!aiQuery.trim()) return;

    const currentQuery = aiQuery.trim();
    const nextUserMessage = {
      role: 'user',
      content: currentQuery
    };

    setAiMessages(prev => [...prev, nextUserMessage]);
    setIsLoading(true);

    try {
      const aiResponse = await askDoubao({
        query: currentQuery,
        history: aiMessages,
        newsList
      });

      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: aiResponse
      }]);
    } catch (error) {
      console.error('豆包调用失败:', error);
      const fallbackResponse = error.code === 'MISSING_DOUBAO_CONFIG'
        ? buildLocalAnswer({ query: currentQuery, newsList })
        : `豆包接口调用失败：${error.message}\n\n我先保留你的问题，建议检查 .env.local 中的接口配置和模型 ID。`;

      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: fallbackResponse
      }]);
    } finally {
      setIsLoading(false);
      setAiQuery(''); // 清空输入框
    }
  };

  const [showAiPopup, setShowAiPopup] = useState(false);
  const [showSavedPopup, setShowSavedPopup] = useState(false);
  const [showCustomPopup, setShowCustomPopup] = useState(false);
  const [isNewsOverlayOpen, setIsNewsOverlayOpen] = useState(false);
  const [hoveredButton, setHoveredButton] = useState('');
  const [selectedTab, setSelectedTab] = useState('ai');
  const aiButtonRef = useRef(null);
  const savedButtonRef = useRef(null);
  const customButtonRef = useRef(null);
  const aiPopupRef = useRef(null);
  const savedPopupRef = useRef(null);
  const customPopupRef = useRef(null);
  const navigate = useNavigate();
  const customNewsList = newsList.filter((news) => news.source === '自定义');
  const compactListStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    maxHeight: isMobile ? '360px' : '348px',
    overflowY: 'auto',
    paddingRight: '4px'
  };
  const floatingPanelStyle = {
    position: 'fixed',
    top: isMobile ? 'auto' : '50%',
    bottom: isMobile ? '84px' : 'auto',
    left: isMobile ? '12px' : '100px',
    right: isMobile ? '12px' : 'auto',
    transform: isMobile ? 'none' : 'translateY(-50%)',
    background: 'white',
    borderRadius: '16px',
    padding: isMobile ? '16px' : '20px',
    width: isMobile ? 'auto' : '300px',
    maxHeight: isMobile ? 'calc(100vh - 96px)' : '80vh',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 16px 40px rgba(0,0,0,0.2)',
    zIndex: 300
  };
  const navIconButtonStyle = (accentColor, tintColor) => ({
    width: isMobile ? '42px' : '46px',
    height: isMobile ? '42px' : '46px',
    borderRadius: '999px',
    background: tintColor,
    border: `1px solid ${accentColor}22`,
    color: accentColor,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease',
    opacity: 1,
    position: 'relative',
    boxShadow: '0 10px 20px rgba(15,23,42,0.12)',
    backdropFilter: 'blur(8px)'
  });
  const navTooltipStyle = (active) => ({
    position: 'absolute',
    top: isMobile ? '-34px' : '-38px',
    left: '50%',
    transform: active ? 'translate(-50%, 0)' : 'translate(-50%, 6px)',
    background: 'rgba(15,23,42,0.9)',
    color: '#fff',
    padding: '5px 9px',
    borderRadius: '8px',
    fontSize: '11px',
    whiteSpace: 'nowrap',
    opacity: active ? 1 : 0,
    pointerEvents: 'none',
    transition: 'opacity 0.18s ease, transform 0.18s ease'
  });
  const popupTitleStyle = {
    margin: 0,
    fontSize: '16px',
    color: '#1f2937',
    fontWeight: 700,
    fontFamily: '"Noto Serif SC", serif'
  };
  const formLabelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '13px',
    color: '#475569',
    fontWeight: 700,
    fontFamily: 'inherit'
  };
  const formFieldStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #e2e8f0',
    borderRadius: '14px',
    fontSize: '14px',
    lineHeight: 1.7,
    color: '#1f2937',
    background: 'rgba(255,255,255,0.92)',
    boxSizing: 'border-box',
    fontFamily: 'inherit'
  };
  const ghostButtonStyle = {
    padding: '10px 16px',
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
    fontFamily: 'inherit'
  };
  const primaryButtonStyle = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '999px',
    fontSize: '14px',
    fontWeight: 700,
    color: '#fff',
    cursor: 'pointer',
    fontFamily: 'inherit'
  };

  useEffect(() => {
    const handlePointerDown = (event) => {
      const clickedAi = aiButtonRef.current?.contains(event.target) || aiPopupRef.current?.contains(event.target);
      const clickedSaved = savedButtonRef.current?.contains(event.target) || savedPopupRef.current?.contains(event.target);
      const clickedCustom = customButtonRef.current?.contains(event.target) || customPopupRef.current?.contains(event.target);

      if (!clickedAi) {
        setShowAiPopup(false);
      }

      if (!clickedSaved) {
        setShowSavedPopup(false);
      }

      if (!clickedCustom && !isNewsOverlayOpen) {
        setShowCustomPopup(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isNewsOverlayOpen]);

  useEffect(() => {
    const handleOverlayChange = (event) => {
      setIsNewsOverlayOpen(Boolean(event.detail?.isOpen));
    };

    window.addEventListener('newsOverlayChange', handleOverlayChange);

    return () => {
      window.removeEventListener('newsOverlayChange', handleOverlayChange);
    };
  }, []);

  useEffect(() => {
    if (!isAddingCard) {
      return undefined;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isAddingCard]);

  return (
    <div style={{
      width: isMobile ? '100%' : '80px',
      background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
      minHeight: isMobile ? '72px' : '100vh',
      height: isMobile ? '72px' : '100vh',
      padding: isMobile ? '10px 16px' : '24px 0',
      position: 'fixed',
      left: 0,
      top: isMobile ? 'auto' : 0,
      bottom: isMobile ? 0 : 'auto',
      right: isMobile ? 0 : 'auto',
      zIndex: 100,
      display: 'flex',
      flexDirection: isMobile ? 'row' : 'column',
      alignItems: 'center',
      justifyContent: isMobile ? 'center' : 'flex-start',
      gap: isMobile ? '28px' : '24px',
      boxShadow: '2px 0 10px rgba(0,0,0,0.08)'
    }}>
      {!isMobile && (
        <div style={{
          writingMode: 'vertical-rl',
          textOrientation: 'upright',
          fontSize: '24px',
          fontWeight: '700',
          color: '#c41e3a',
          letterSpacing: '10px',
          marginBottom: '24px',
          fontFamily: '"Noto Serif SC", serif',
          textShadow: '1px 1px 2px rgba(0,0,0,0.1)'
        }}>
          教育时政
        </div>
      )}
      

      
      {/* AI助手按钮 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          ref={aiButtonRef}
          onClick={() => {
            setSelectedTab('ai');
            setShowSavedPopup(false);
            setShowCustomPopup(false);
            setShowAiPopup(!showAiPopup);
          }}
          style={navIconButtonStyle('#2563eb', '#eff6ff')}
          onMouseEnter={(e) => {
            setHoveredButton('ai');
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            setHoveredButton('');
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.opacity = '0.86';
          }}
          onTouchStart={() => setHoveredButton('ai')}
        >
          <SparkleIcon color="#2563eb" />
          <span style={navTooltipStyle(hoveredButton === 'ai')}>
            AI助手
          </span>
        </button>
      </div>
      
      {/* 收藏按钮 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          ref={savedButtonRef}
          onClick={() => {
            setSelectedTab('saved');
            setShowAiPopup(false);
            setShowCustomPopup(false);
            setShowSavedPopup(!showSavedPopup);
          }}
          style={navIconButtonStyle('#d97706', '#fff7ed')}
          onMouseEnter={(e) => {
            setHoveredButton('saved');
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            setHoveredButton('');
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.opacity = '0.86';
          }}
          onTouchStart={() => setHoveredButton('saved')}
        >
          <BookmarkIcon color="#d97706" />
          <span style={navTooltipStyle(hoveredButton === 'saved')}>
            我的收藏
          </span>
        </button>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          ref={customButtonRef}
          onClick={() => {
            setSelectedTab('custom');
            setShowAiPopup(false);
            setShowSavedPopup(false);
            setShowCustomPopup(!showCustomPopup);
          }}
          style={navIconButtonStyle('#7c3aed', '#f5f3ff')}
          onMouseEnter={(e) => {
            setHoveredButton('custom');
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            setHoveredButton('');
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.opacity = '0.86';
          }}
          onTouchStart={() => setHoveredButton('custom')}
        >
          <StackIcon color="#7c3aed" />
          <span style={navTooltipStyle(hoveredButton === 'custom')}>
            自定义列表
          </span>
        </button>
      </div>
      
      {/* 添加卡片按钮 */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <button
          onClick={() => {
            setSelectedTab('add');
            setShowAiPopup(false);
            setShowSavedPopup(false);
            setShowCustomPopup(false);
            handleAddCard();
          }}
          style={navIconButtonStyle('#16a34a', '#f0fdf4')}
          onMouseEnter={(e) => {
            setHoveredButton('add');
            e.currentTarget.style.transform = 'scale(1.05)';
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            setHoveredButton('');
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.opacity = '0.86';
          }}
          onTouchStart={() => setHoveredButton('add')}
        >
          <PlusIcon color="#16a34a" />
          <span style={navTooltipStyle(hoveredButton === 'add')}>
            添加卡片
          </span>
        </button>
      </div>
      
      {/* AI助手悬浮弹窗 */}
      {showAiPopup && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setShowAiPopup(false)}
            style={{
              position: 'fixed',
              top: isMobile ? 0 : 0,
              left: isMobile ? 0 : '80px',
              right: 0,
              bottom: isMobile ? '72px' : 0,
              zIndex: 250,
              background: 'transparent'
            }}
          />
          <div ref={aiPopupRef} style={floatingPanelStyle}>
          <div className="soft-scrollbar" style={{ overflowY: 'auto', paddingRight: '10px', marginRight: '-10px', flex: 1, minHeight: 0, overscrollBehavior: 'contain' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ fontSize: '16px', color: '#333' }}>AI助手</h3>
            <button
              onClick={() => setShowAiPopup(false)}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#999'
              }}
            >
              ×
            </button>
          </div>

          <div style={{
            marginBottom: '12px',
            padding: '10px 12px',
            background: isDoubaoReady ? '#eefaf2' : '#fff7e6',
            border: `1px solid ${isDoubaoReady ? '#b7ebc6' : '#ffd591'}`,
            borderRadius: '8px',
            fontSize: '12px',
            lineHeight: 1.6,
            color: '#555'
          }}>
            {isDoubaoReady
              ? '当前已接入豆包接口，问题会直接提交给模型回答。'
              : '当前还没配置豆包接口，先使用站内新闻内容做兜底回答；在项目根目录创建 `.env.local` 并填写 `VITE_DOUBAO_API_KEY`、`VITE_DOUBAO_MODEL` 后即可切换成真实模型问答。'}
          </div>
          
          {/* 对话历史 */}
          <div style={{
            maxHeight: '300px',
            overflowY: 'auto',
            marginBottom: '16px',
            padding: '8px',
            background: '#f9f9f9',
            borderRadius: '4px'
          }}>
            {aiMessages.map((message, index) => (
              <div key={index} style={{
                marginBottom: '12px',
                padding: '8px',
                borderRadius: '4px',
                background: message.role === 'user' ? '#e3f2fd' : 'white'
              }}>
                <div style={{
                  fontSize: '12px',
                  color: '#666',
                  marginBottom: '4px'
                }}>
                  {message.role === 'user' ? '我' : 'AI'}
                </div>
                <div style={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#333'
                }}>
                  {message.content}
                </div>
              </div>
            ))}
          </div>
          
          {/* 输入区域 */}
          <div style={{
            marginBottom: '16px'
          }}>
            <textarea
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAiQuery();
                }
              }}
              placeholder="输入您的问题...（按Enter发送）"
              style={{
                width: '100%',
                height: '80px',
                padding: '12px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '14px',
                resize: 'none',
                fontFamily: 'inherit'
              }}
            />
            <button
              onClick={handleAiQuery}
              style={{
                width: '100%',
                marginTop: '8px',
                padding: '8px',
                background: '#4a90e2',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              发送
            </button>
          </div>
          
          {isLoading && (
            <div style={{
              padding: '10px',
              fontSize: '14px',
              color: '#666',
              textAlign: 'center'
            }}>
              思考中...
            </div>
          )}
          </div>
        </div>
        </>
      )}
      
      {/* 收藏悬浮弹窗 */}
      <FloatingSidebarPanel
        isOpen={showSavedPopup}
        onClose={() => setShowSavedPopup(false)}
        panelRef={savedPopupRef}
        isMobile={isMobile}
        title="我的收藏"
        titleStyle={popupTitleStyle}
        headerActions={savedNews && savedNews.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              onChangeHomeListMode?.('saved');
              setShowSavedPopup(false);
            }}
            style={{
              border: 'none',
              background: '#fff7ed',
              color: '#c2410c',
              borderRadius: '999px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            展开全部
          </button>
        ) : null}
      >
        {savedNews && savedNews.length > 0 ? (
          <div className="soft-scrollbar" style={compactListStyle}>
            {savedNews.map((news) => (
              <div
                key={news.id}
                style={{
                  background: '#fff7ed',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #fed7aa',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: '#333',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setShowSavedPopup(false);
                  navigate(`/news/${news.id}`);
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px', color: '#7c2d12' }}>{news.title}</div>
                <div style={{ fontSize: '12px', color: '#c2410c' }}>{news.date}</div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              fontSize: '14px',
              color: '#999',
              textAlign: 'center',
              padding: '40px 0'
            }}
          >
            暂无收藏
          </div>
        )}
      </FloatingSidebarPanel>

      <FloatingSidebarPanel
        isOpen={showCustomPopup}
        onClose={() => setShowCustomPopup(false)}
        panelRef={customPopupRef}
        isMobile={isMobile}
        title="自定义列表"
        titleStyle={popupTitleStyle}
        headerActions={customNewsList.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              onChangeHomeListMode?.('custom');
              setShowCustomPopup(false);
            }}
            style={{
              border: 'none',
              background: '#faf5ff',
              color: '#7c3aed',
              borderRadius: '999px',
              padding: '6px 10px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            展开全部
          </button>
        ) : null}
      >
        {customNewsList.length > 0 ? (
          <div className="soft-scrollbar" style={compactListStyle}>
            {customNewsList.map((news) => (
              <div
                key={news.id}
                style={{
                  background: '#faf5ff',
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #e9d5ff',
                  fontSize: '14px',
                  lineHeight: 1.5,
                  color: '#333',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  navigate(`/news/${news.id}`);
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>{news.title}</div>
                <div style={{ fontSize: '12px', color: '#7c3aed' }}>{news.date}</div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      const confirmed = window.confirm(`确定删除自定义卡片《${news.title}》吗？`);
                      if (!confirmed) {
                        return;
                      }
                      onDeleteCard?.(news.id);
                    }}
                    style={{
                      border: '1px solid #fbcfe8',
                      background: '#fff1f6',
                      color: '#be185d',
                      borderRadius: '999px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              fontSize: '14px',
              color: '#999',
              textAlign: 'center',
              padding: '40px 0'
            }}
          >
            暂无自定义卡片
          </div>
        )}
      </FloatingSidebarPanel>
      
      <AddCardModal
        isOpen={isAddingCard}
        isMobile={isMobile}
        onClose={() => setIsAddingCard(false)}
        popupTitleStyle={popupTitleStyle}
        formLabelStyle={formLabelStyle}
        formFieldStyle={formFieldStyle}
        ghostButtonStyle={ghostButtonStyle}
        primaryButtonStyle={primaryButtonStyle}
        newCard={newCard}
        setNewCard={(nextCard) => {
          setNewCard(nextCard);
          setImportStatus('');
          setDuplicateNews(null);
        }}
        importStatus={importStatus}
        duplicateNews={duplicateNews}
        handleImportCard={handleImportCard}
        isImportingCard={isImportingCard}
        handleSaveCard={handleSaveCard}
      />
      

    </div>
  );
};

export default Timeline;
