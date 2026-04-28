const floatingActionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '12px 18px',
  borderRadius: '999px',
  border: '1px solid #d6dde8',
  background: '#ffffff',
  color: '#334155',
  cursor: 'pointer',
  fontSize: '14px',
  boxShadow: '0 12px 24px rgba(15,23,42,0.12)',
  textDecoration: 'none'
};

const RightFloatingActions = ({
  isMobile,
  aiButtonRef,
  sourceButtonRef,
  sourcePopupRef,
  aiPopupRef,
  setIsSourceMenuOpen,
  setIsAiOpen,
  isSaved,
  onSaveNews,
  fullScreenNews,
  fullScreenReferences,
  openReferenceAction,
  isSourceMenuOpen,
  isAiOpen,
  isDoubaoReady,
  aiMessages,
  isAiLoading,
  aiQuery,
  setAiQuery,
  handleAiQuery,
  SparkleIcon,
  BookmarkIcon,
  LinkIcon
}) => (
  <>
    <div
      style={{
        position: 'fixed',
        right: isMobile ? '18px' : '26px',
        bottom: isMobile ? '94px' : '64px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        zIndex: 1002
      }}
    >
      <button
        ref={aiButtonRef}
        type="button"
        onClick={() => {
          setIsSourceMenuOpen(false);
          setIsAiOpen((prev) => !prev);
        }}
        style={{
          ...floatingActionStyle,
          borderColor: '#dbeafe',
          background: '#eff6ff',
          color: '#1d4ed8',
          justifyContent: 'center',
          gap: '10px'
        }}
      >
        <SparkleIcon size={20} color="#1d4ed8" />
        AI助手
      </button>
      <button
        type="button"
        onClick={() => onSaveNews(fullScreenNews.id)}
        style={{
          ...floatingActionStyle,
          color: isSaved(fullScreenNews.id) ? '#f59e0b' : '#334155',
          gap: '10px'
        }}
      >
        <BookmarkIcon
          filled={isSaved(fullScreenNews.id)}
          size={20}
          color={isSaved(fullScreenNews.id) ? '#f59e0b' : '#334155'}
        />
        {isSaved(fullScreenNews.id) ? '已收藏' : '收藏'}
      </button>
      <button
        ref={sourceButtonRef}
        type="button"
        onClick={() => {
          if (!fullScreenReferences.length) {
            return;
          }
          openReferenceAction(fullScreenReferences, { closeAi: true });
        }}
        style={{
          ...floatingActionStyle,
          cursor: fullScreenReferences.length ? 'pointer' : 'not-allowed',
          opacity: fullScreenReferences.length ? 1 : 0.45,
          gap: '10px'
        }}
        title={
          !fullScreenReferences.length
            ? '当前没有可用来源'
            : fullScreenReferences.length === 1
              ? '打开官方来源'
              : '查看全部来源链接'
        }
      >
        <LinkIcon size={20} />
        来源链接
      </button>
    </div>
    {isSourceMenuOpen && fullScreenReferences.length > 1 && (
      <div
        ref={sourcePopupRef}
        data-popup-layer="true"
        style={{
          position: 'fixed',
          right: isMobile ? '18px' : '26px',
          bottom: isMobile ? '156px' : '128px',
          width: isMobile ? 'calc(100vw - 36px)' : '360px',
          maxWidth: 'calc(100vw - 36px)',
          background: '#fff',
          borderRadius: '18px',
          border: '1px solid #dbe4ef',
          boxShadow: '0 24px 48px rgba(15,23,42,0.16)',
          zIndex: 1003,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            background: '#f8fafc',
            color: '#1f2937',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px'
          }}
        >
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <LinkIcon size={18} color="#1d4ed8" />
            全部来源
          </div>
          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
            {fullScreenReferences.length} 条
          </span>
        </div>
        <div
          style={{
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            gap: '8px',
            maxHeight: isMobile ? '42vh' : '360px',
            overflowY: 'auto'
          }}
          className="soft-scrollbar"
        >
          {fullScreenReferences.map((reference, index) => (
            <a
              key={reference.id}
              href={reference.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setIsSourceMenuOpen(false)}
              style={{
                display: 'grid',
                gridTemplateColumns: '64px minmax(0, 1fr)',
                width: '100%',
                boxSizing: 'border-box',
                alignItems: 'start',
                columnGap: '14px',
                padding: '12px',
                borderRadius: '14px',
                border: '1px solid #dbe4ef',
                background: index === 0 ? '#f3f8ff' : '#fff',
                textDecoration: 'none'
              }}
            >
              <div
                style={{
                  width: '64px',
                  height: '30px',
                  borderRadius: '999px',
                  background: index === 0 ? '#dbeafe' : '#f1f5f9',
                  color: index === 0 ? '#1d4ed8' : '#64748b',
                  fontSize: '12px',
                  fontWeight: 700,
                  textAlign: 'center',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxSizing: 'border-box'
                }}
              >
                {index === 0 ? '官方' : '转载'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    color: '#1f2937',
                    fontSize: '14px',
                    fontWeight: 600,
                    lineHeight: 1.5,
                    marginBottom: '4px',
                    wordBreak: 'break-word'
                  }}
                >
                  {reference.label}
                </div>
                <div
                  style={{
                    color: '#64748b',
                    fontSize: '12px',
                    lineHeight: 1.6,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                  title={reference.url}
                >
                  {reference.url}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    )}
    {isAiOpen && (
      <div
        ref={aiPopupRef}
        style={{
          position: 'fixed',
          right: isMobile ? '18px' : '26px',
          bottom: isMobile ? '248px' : '220px',
          width: isMobile ? 'calc(100vw - 36px)' : '360px',
          maxWidth: 'calc(100vw - 36px)',
          background: '#fff',
          borderRadius: '18px',
          border: '1px solid #dbe4ef',
          boxShadow: '0 24px 48px rgba(15,23,42,0.16)',
          zIndex: 1003,
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <SparkleIcon size={18} />
          AI 助手
        </div>
        <div style={{ padding: '14px 16px' }}>
          <div
            style={{
              marginBottom: '12px',
              padding: '10px 12px',
              background: isDoubaoReady ? '#eefaf2' : '#fff7e6',
              border: `1px solid ${isDoubaoReady ? '#b7ebc6' : '#ffd591'}`,
              borderRadius: '12px',
              fontSize: '12px',
              color: '#556070',
              lineHeight: 1.7
            }}
          >
            {isDoubaoReady
              ? '当前已接入 AI 问答。'
              : '当前未配置在线模型，会先用站内内容做兜底回答。请在项目根目录创建 `.env.local`，填入 `VITE_DOUBAO_API_KEY`、`VITE_DOUBAO_MODEL`，可参考 `.env.example`。'}
          </div>
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginBottom: '12px'
            }}
            className="soft-scrollbar"
          >
            {aiMessages.map((message, index) => (
              <div
                key={`${message.role}_${index}`}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'stretch',
                  background: message.role === 'user' ? '#eff6ff' : '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '10px 12px',
                  fontSize: '13px',
                  lineHeight: 1.7,
                  color: '#334155'
                }}
              >
                {message.content}
              </div>
            ))}
            {isAiLoading && (
              <div
                style={{
                  padding: '10px 12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '13px',
                  color: '#64748b'
                }}
              >
                AI 思考中...
              </div>
            )}
          </div>
          <textarea
            value={aiQuery}
            onChange={(event) => setAiQuery(event.target.value)}
            placeholder="输入你想追问这条政策的内容..."
            style={{
              width: '100%',
              minHeight: '92px',
              padding: '12px',
              borderRadius: '12px',
              border: '1px solid #d0d7e2',
              fontSize: '13px',
              lineHeight: 1.7,
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '10px'
            }}
          >
            <button
              type="button"
              onClick={handleAiQuery}
              style={{
                ...floatingActionStyle,
                borderColor: '#bfdbfe',
                background: '#eff6ff',
                color: '#1d4ed8',
                padding: '10px 16px'
              }}
            >
              <SparkleIcon size={18} />
              发送
            </button>
          </div>
        </div>
      </div>
    )}
  </>
);

export default RightFloatingActions;
