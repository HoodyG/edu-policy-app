const FloatingSidebarPanel = ({
  isOpen,
  onClose,
  panelRef,
  isMobile,
  title,
  titleStyle,
  headerActions,
  children
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        style={{
          position: 'fixed',
          top: isMobile ? '72px' : 0,
          left: isMobile ? 0 : '80px',
          right: 0,
          bottom: 0,
          zIndex: 250,
          background: 'transparent'
        }}
      />
      <div
        ref={panelRef}
        style={{
          position: 'fixed',
          top: isMobile ? '84px' : '50%',
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
        }}
      >
        <div
          className="soft-scrollbar"
          style={{
            overflowY: 'auto',
            paddingRight: '10px',
            marginRight: '-10px',
            flex: 1,
            minHeight: 0,
            overscrollBehavior: 'contain'
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <h3 style={titleStyle}>{title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {headerActions}
              <button
                onClick={onClose}
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
          </div>
          {children}
        </div>
      </div>
    </>
  );
};

export default FloatingSidebarPanel;
