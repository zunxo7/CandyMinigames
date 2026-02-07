// Same as ContentEditor: only <b>, <i>, <u>, <br> for shop text
function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    let s = html
        .replace(/<(b|i|u|br)(\s[^>]*)?>/gi, '<$1>')
        .replace(/<\/(b|i|u|br)(\s[^>]*)?>/gi, '</$1>');
    return s.replace(/<(?!\/?(b|i|u|br)>)[^>]*>/gi, '');
}

const ContentRenderer = ({ content, width, height }) => {
    if (!content || !Array.isArray(content) || content.length === 0) {
        return (
            <div className="content-renderer empty">
                <p>No content to display</p>
            </div>
        );
    }

    const defaultSize = (type) => {
        if (type === 'image') return { w: 200, h: 150 };
        if (type === 'video') return { w: 320, h: 180 };
        return { w: 200, h: 40 };
    };

    return (
        <div className="content-renderer" style={width && height ? { width, height, minHeight: 'auto' } : {}}>
            {content.map(element => {
                const fallback = defaultSize(element.type);
                const elW = element.width ?? fallback.w;
                const elH = element.height ?? fallback.h;
                return (
                <div
                    key={element.id}
                    className={`rendered-element ${element.type}`}
                    style={{
                        position: 'absolute',
                        left: element.x ?? 0,
                        top: element.y ?? 0,
                        width: elW,
                        height: elH
                    }}
                >
                    {element.type === 'text' && (
                        <div
                            className="rendered-text"
                            style={{
                                fontSize: element.fontSize || 16,
                                fontWeight: element.fontWeight || 'normal',
                                fontStyle: element.fontStyle || 'normal',
                                textDecoration: element.textDecoration || 'none',
                                textAlign: element.textAlign || 'center',
                                justifyContent: element.justifyContent || 'center',
                                alignItems: element.alignItems || 'center',
                                display: 'flex',
                                width: '100%',
                                height: '100%'
                            }}
                        >
                            {element.content && /<[a-z]/.test(element.content) ? (
                                <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(element.content) }} />
                            ) : (
                                element.content
                            )}
                        </div>
                    )}

                    {element.type === 'image' && (
                        <img
                            src={element.content}
                            alt="Content"
                            className="rendered-image"
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'contain',
                                display: 'block',
                                transform: [
                                    `scaleX(${element.flipHorizontal ? -1 : 1})`,
                                    `scaleY(${element.flipVertical ? -1 : 1})`,
                                    `rotate(${element.rotation || 0}deg)`
                                ].join(' ')
                            }}
                        />
                    )}

                    {element.type === 'video' && (
                        <iframe
                            src={element.content}
                            className="rendered-video"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ width: '100%', height: '100%' }}
                        />
                    )}
                </div>
            );
            })}
        </div>
    );
};

export default ContentRenderer;
