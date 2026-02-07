import { useState, useRef, useEffect } from 'react';
import {
    ArrowLeft,
    TextT,
    Image,
    VideoCamera,
    FloppyDisk,
    Trash,
    ArrowsOutCardinal,
    X,
    TextB,
    TextItalic,
    TextUnderline,
    TextAlignLeft,
    TextAlignCenter,
    TextAlignRight,
    AlignTop,
    AlignCenterVertical,
    AlignBottom,
    FlipHorizontal,
    FlipVertical,
    ArrowCounterClockwise,
    ArrowClockwise
} from '@phosphor-icons/react';
import candyIcon from '../assets/Candy Icon.webp';

// Allow only <b>, <i>, <u>, <br> for inline formatting in shop text; strip other tags and attributes
function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    let s = html
        .replace(/<(b|i|u|br)(\s[^>]*)?>/gi, '<$1>')
        .replace(/<\/(b|i|u|br)(\s[^>]*)?>/gi, '</$1>');
    return s.replace(/<(?!\/?(b|i|u|br)>)[^>]*>/gi, '');
}

const ContentEditor = ({ item, onSave, onCancel }) => {
    const [title, setTitle] = useState(item?.title || '');
    const [price, setPrice] = useState(item?.price || 0);
    const [elements, setElements] = useState(item?.content || []);
    const [selectedId, setSelectedId] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [editingTextId, setEditingTextId] = useState(null);
    const [showUrlModal, setShowUrlModal] = useState(null); // 'image' or 'video'
    const [urlInput, setUrlInput] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const fileInputRef = useRef(null);
    const [canvasSize, setCanvasSize] = useState({
        width: item?.canvas_width || item?.canvasWidth || 1000,
        height: item?.canvas_height || item?.canvasHeight || 800
    });
    const [zoom, setZoom] = useState(1);
    const canvasRef = useRef(null);
    const textEditRef = useRef(null);

    const generateId = () => `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const addTextElement = () => {
        const newElement = {
            id: generateId(),
            type: 'text',
            content: 'Click to edit',
            x: 50,
            y: 50,
            width: 200,
            height: 40,
            fontSize: 24,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none',
            textAlign: 'center',
            justifyContent: 'center',
            alignItems: 'center'
        };
        setElements([...elements, newElement]);
        setSelectedId(newElement.id);
        setEditingTextId(newElement.id);
    };

    const openImageModal = () => {
        setShowUrlModal('image');
        setUrlInput('');
    };

    const handleImageFileSelect = (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = () => {
            const dataUrl = reader.result;
            const newElement = {
                id: generateId(),
                type: 'image',
                content: dataUrl,
                x: 50,
                y: 50,
                width: 200,
                height: 150,
                flipHorizontal: false,
                flipVertical: false,
                rotation: 0
            };
            setElements(prev => [...prev, newElement]);
            setSelectedId(newElement.id);
            setShowUrlModal(null);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const openVideoModal = () => {
        setShowUrlModal('video');
        setUrlInput('');
    };

    const handleUrlSubmit = async () => {
        if (!urlInput.trim()) {
            setShowUrlModal(null);
            return;
        }

        if (showUrlModal === 'image') {
            const imageContent = urlInput.trim();
            const newElement = {
                id: generateId(),
                type: 'image',
                content: imageContent,
                x: 50,
                y: 50,
                width: 200,
                height: 150,
                flipHorizontal: false,
                flipVertical: false,
                rotation: 0
            };
            setElements([...elements, newElement]);
            setSelectedId(newElement.id);
            setShowUrlModal(null);
        } else if (showUrlModal === 'video') {
            // Convert YouTube URL to embed format
            let embedUrl = urlInput.trim();
            if (embedUrl.includes('youtube.com/watch')) {
                const videoId = embedUrl.split('v=')[1]?.split('&')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
            } else if (embedUrl.includes('youtu.be/')) {
                const videoId = embedUrl.split('youtu.be/')[1]?.split('?')[0];
                embedUrl = `https://www.youtube.com/embed/${videoId}`;
            }

            const newElement = {
                id: generateId(),
                type: 'video',
                content: embedUrl,
                x: 50,
                y: 50,
                width: 320,
                height: 180
            };
            setElements([...elements, newElement]);
            setSelectedId(newElement.id);
        }

        if (showUrlModal === 'video') {
            setShowUrlModal(null);
            setUrlInput('');
        }
    };

    const updateElement = (id, updates) => {
        setElements(elements.map(el =>
            el.id === id ? { ...el, ...updates } : el
        ));
    };

    const deleteElement = (id) => {
        setElements(elements.filter(el => el.id !== id));
        setSelectedId(null);
        setEditingTextId(null);
    };

    const handleMouseDown = (e, elementId) => {
        // Don't start drag if we're editing text
        if (editingTextId === elementId) return;

        if (e.target.classList.contains('resize-handle')) {
            setIsResizing(true);
        } else {
            setIsDragging(true);
        }
        setSelectedId(elementId);

        const element = elements.find(el => el.id === elementId);
        const rect = canvasRef.current.getBoundingClientRect();
        setDragOffset({
            x: e.clientX - rect.left - element.x,
            y: e.clientY - rect.top - element.y
        });
    };

    const handleMouseMove = (e) => {
        if (!selectedId || (!isDragging && !isResizing)) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const element = elements.find(el => el.id === selectedId);

        if (isDragging) {
            const newX = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, rect.width - element.width));
            const newY = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, rect.height - element.height));
            updateElement(selectedId, { x: newX, y: newY });
        } else if (isResizing) {
            const newWidth = Math.max(50, e.clientX - rect.left - element.x);
            const newHeight = Math.max(30, e.clientY - rect.top - element.y);
            updateElement(selectedId, { width: newWidth, height: newHeight });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setIsResizing(false);
    };

    const handleTextClick = (e, element) => {
        e.stopPropagation();
        setSelectedId(element.id);
    };

    const handleTextDoubleClick = (e, element) => {
        e.stopPropagation();
        setSelectedId(element.id);
        if (element.type === 'text') {
            setEditingTextId(element.id);
        }
    };

    const handleTextChange = (e, elementId) => {
        let html = e.target.innerHTML;
        const el = elements.find(x => x.id === elementId);
        const prev = el?.content || '';
        // If browser duplicated content (e.g. after bold), use single copy
        if (html.length >= 2) {
            const half = Math.floor(html.length / 2);
            if (html.substring(0, half) === html.substring(half)) html = html.substring(0, half);
        }
        if (prev && html === prev + prev) return;
        updateElement(elementId, { content: html });
    };

    const applyInlineBold = () => {
        if (!editingTextId || !textEditRef.current) return;
        textEditRef.current.focus();
        document.execCommand('bold', false, null);
        const html = textEditRef.current.innerHTML;
        updateElement(editingTextId, { content: html });
    };

    const handleRichTextPaste = (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    };

    const toggleStyle = (styleType) => {
        if (!selectedId) return;
        const element = elements.find(el => el.id === selectedId);
        if (element.type !== 'text') return;

        // Inline bold: when editing, Bold button applies to selection only (handled by applyInlineBold)
        if (styleType === 'bold' && editingTextId === selectedId) {
            applyInlineBold();
            return;
        }
        if (styleType === 'bold' && editingTextId !== selectedId) {
            // Not editing: toggle whole-element bold (legacy) or do nothing; we prefer inline only when editing
            const updates = { fontWeight: element.fontWeight === 'bold' ? 'normal' : 'bold' };
            updateElement(selectedId, updates);
            return;
        }

        let updates = {};
        if (styleType === 'italic') {
            updates.fontStyle = element.fontStyle === 'italic' ? 'normal' : 'italic';
        } else if (styleType === 'underline') {
            updates.textDecoration = element.textDecoration === 'underline' ? 'none' : 'underline';
        } else if (['left', 'center', 'right'].includes(styleType)) {
            updates.textAlign = styleType;
            updates.justifyContent = styleType === 'left' ? 'flex-start' : styleType === 'right' ? 'flex-end' : 'center';
        } else if (['top', 'middle', 'bottom'].includes(styleType)) {
            updates.alignItems = styleType === 'top' ? 'flex-start' : styleType === 'bottom' ? 'flex-end' : 'center';
        }
        updateElement(selectedId, updates);
    };

    const handleFontSizeChange = (delta) => {
        if (!selectedId) return;
        const element = elements.find(el => el.id === selectedId);
        if (element.type !== 'text') return;
        const newSize = Math.max(8, (element.fontSize || 16) + delta);
        updateElement(selectedId, { fontSize: newSize });
    };

    const toggleImageTransform = (action) => {
        if (!selectedId) return;
        const element = elements.find(el => el.id === selectedId);
        if (element.type !== 'image') return;
        const updates = {};
        if (action === 'flipH') updates.flipHorizontal = !element.flipHorizontal;
        else if (action === 'flipV') updates.flipVertical = !element.flipVertical;
        else if (action === 'rotateLeft') updates.rotation = ((element.rotation || 0) - 90 + 360) % 360;
        else if (action === 'rotateRight') updates.rotation = ((element.rotation || 0) + 90) % 360;
        else if (action === 'rotate180') updates.rotation = ((element.rotation || 0) + 180) % 360;
        if (Object.keys(updates).length) updateElement(selectedId, updates);
    };

    const handlePaste = (e) => {
        if (e.target.closest('input, textarea, [contenteditable="true"]')) return;
        const dt = e.clipboardData;
        if (!dt) return;

        for (const item of dt.items) {
            if (item.type.indexOf('image/') === 0) {
                e.preventDefault();
                const file = item.getAsFile();
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    const newElement = {
                        id: generateId(),
                        type: 'image',
                        content: reader.result,
                        x: 50,
                        y: 50,
                        width: 200,
                        height: 150,
                        flipHorizontal: false,
                        flipVertical: false,
                        rotation: 0
                    };
                    setElements(prev => [...prev, newElement]);
                    setSelectedId(newElement.id);
                };
                reader.readAsDataURL(file);
                return;
            }
        }

        const text = dt.getData('text/plain')?.trim();
        if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
            e.preventDefault();
            const img = new window.Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const newElement = {
                    id: generateId(),
                    type: 'image',
                    content: text,
                    x: 50,
                    y: 50,
                    width: 200,
                    height: 150,
                    flipHorizontal: false,
                    flipVertical: false,
                    rotation: 0
                };
                setElements(prev => [...prev, newElement]);
                setSelectedId(newElement.id);
            };
            img.onerror = () => {
                setErrorMessage('Could not load image from link. Try a direct image URL.');
            };
            img.src = text;
            return;
        }

        if (text && !text.match(/^https?:\/\//)) {
            e.preventDefault();
            const content = text.replace(/\n/g, '<br>');
            const newElement = {
                id: generateId(),
                type: 'text',
                content,
                x: 50,
                y: 50,
                width: 200,
                height: 40,
                fontSize: 24,
                fontWeight: 'normal',
                fontStyle: 'normal',
                textDecoration: 'none',
                textAlign: 'center',
                justifyContent: 'center',
                alignItems: 'center'
            };
            setElements(prev => [...prev, newElement]);
            setSelectedId(newElement.id);
        }
    };

    const handleTextBlur = () => {
        if (textEditRef.current && editingTextId) {
            let html = textEditRef.current.innerHTML;
            const el = elements.find(x => x.id === editingTextId);
            const prev = el?.content || '';
            // If contenteditable duplicated content (e.g. after bold), keep only one copy
            if (html.length >= 2) {
                const half = Math.floor(html.length / 2);
                if (html.substring(0, half) === html.substring(half)) html = html.substring(0, half);
            }
            if (!prev || html !== prev + prev) {
                updateElement(editingTextId, { content: html });
            }
        }
        setEditingTextId(null);
    };

    const handleSave = () => {
        if (!title.trim()) {
            setErrorMessage('Please enter a title');
            return;
        }
        onSave({
            title: title.trim(),
            price: parseInt(price) || 0,
            canvas_width: canvasSize.width,
            canvas_height: canvasSize.height,
            content: elements
        });
    };

    // Set contenteditable content once when entering edit mode (avoids ref double-set visual glitch)
    useEffect(() => {
        if (!editingTextId) return;
        const el = elements.find(e => e.id === editingTextId);
        const html = el?.content || '';
        const id = requestAnimationFrame(() => {
            if (textEditRef.current) textEditRef.current.innerHTML = html;
        });
        return () => cancelAnimationFrame(id);
    }, [editingTextId]);

    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };
        const handleKeyDown = (e) => {
            if (e.key === 'Delete' && selectedId && !editingTextId) {
                deleteElement(selectedId);
            }
            // Ctrl/Cmd+B = bold selection when editing text
            if ((e.ctrlKey || e.metaKey) && e.key === 'b' && editingTextId) {
                e.preventDefault();
                applyInlineBold();
            }
        };

        window.addEventListener('mouseup', handleGlobalMouseUp);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('paste', handlePaste);

        return () => {
            window.removeEventListener('mouseup', handleGlobalMouseUp);
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('paste', handlePaste);
        };
    }, [selectedId, editingTextId]);

    return (
        <div className="content-editor">
            {/* URL Input Modal */}
            {showUrlModal && (
                <div className="modal-backdrop" onClick={() => setShowUrlModal(null)}>
                    <div className="url-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-btn" onClick={() => setShowUrlModal(null)}>
                            <X size={18} weight="bold" />
                        </button>
                        <div className="modal-icon">
                            {showUrlModal === 'image' ? <Image size={32} weight="fill" /> : <VideoCamera size={32} weight="fill" />}
                        </div>
                        <h2 className="modal-title">
                            {showUrlModal === 'image' ? 'Add Image' : 'Add Video'}
                        </h2>
                        <p className="modal-subtitle">
                            {showUrlModal === 'image' ? 'Enter the image URL' : 'Enter YouTube or video URL'}
                        </p>
                        <input
                            type="text"
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder={showUrlModal === 'image' ? 'https://example.com/image.jpg' : 'https://youtube.com/watch?v=...'}
                            className="modal-input"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
                        />
                        {showUrlModal === 'image' && (
                            <>
                                <p className="url-modal-or">or</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageFileSelect}
                                    className="url-modal-file-input"
                                    aria-hidden
                                />
                                <button
                                    type="button"
                                    className="modal-btn secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    Choose file from device
                                </button>
                            </>
                        )}
                        <button
                            className="modal-btn primary"
                            onClick={() => handleUrlSubmit()}
                        >
                            Add {showUrlModal === 'image' ? 'Image' : 'Video'}
                        </button>
                    </div>
                </div>
            )}



            {/* Error Toast */}
            {errorMessage && (
                <div className="error-toast" onClick={() => setErrorMessage('')}>
                    {errorMessage}
                </div>
            )}

            {/* Header */}
            <div className="editor-header">
                <button className="back-btn" onClick={onCancel}>
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">{item ? 'Edit Item' : 'New Item'}</h1>
                <button className="save-btn" onClick={handleSave}>
                    <FloppyDisk size={24} weight="fill" />
                </button>
            </div>

            <div className="editor-details">
                <div className="details-unified-row">
                    <div className="input-group">
                        <label>Name:</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Item Title"
                            className="editor-title-input"
                        />
                    </div>

                    <div className="input-group">
                        <label>Price:</label>
                        <div className="price-wrapper">
                            <img src={candyIcon} alt="Candy" className="candy-icon-inline" />
                            <input
                                type="number"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                placeholder="0"
                                min="0"
                                className="editor-price-input"
                            />
                        </div>
                    </div>



                    <div className="input-group">
                        <label>Size:</label>
                        <div className="size-inputs">
                            <input
                                type="number"
                                value={canvasSize.width}
                                onChange={(e) => setCanvasSize({ ...canvasSize, width: parseInt(e.target.value) || 320 })}
                                placeholder="W"
                                className="size-input"
                            />
                            <span>x</span>
                            <input
                                type="number"
                                value={canvasSize.height}
                                onChange={(e) => setCanvasSize({ ...canvasSize, height: parseInt(e.target.value) || 400 })}
                                placeholder="H"
                                className="size-input"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar - Fixed Height Container to prevent jumping */}
            <div className="editor-toolbar-container">
                <div className="editor-toolbar">
                    <div className="toolbar-group">
                        <button onClick={addTextElement} title="Add Text">
                            <TextT size={24} weight="bold" />
                            <span>Text</span>
                        </button>
                        <button onClick={openImageModal} title="Add Image">
                            <Image size={24} weight="bold" />
                            <span>Image</span>
                        </button>
                        <button onClick={openVideoModal} title="Add Video">
                            <VideoCamera size={24} weight="bold" />
                            <span>Video</span>
                        </button>
                    </div>

                    {selectedId && elements.find(el => el.id === selectedId)?.type === 'image' ? (
                        <div className="toolbar-group styling-controls">
                            <button onClick={() => toggleImageTransform('flipH')} title="Flip horizontal" className={elements.find(el => el.id === selectedId).flipHorizontal ? 'active' : ''}>
                                <FlipHorizontal size={20} weight="bold" />
                            </button>
                            <button onClick={() => toggleImageTransform('flipV')} title="Flip vertical" className={elements.find(el => el.id === selectedId).flipVertical ? 'active' : ''}>
                                <FlipVertical size={20} weight="bold" />
                            </button>
                            <button onClick={() => toggleImageTransform('rotateLeft')} title="Rotate left 90°">
                                <ArrowCounterClockwise size={20} weight="bold" />
                            </button>
                            <button onClick={() => toggleImageTransform('rotateRight')} title="Rotate right 90°">
                                <ArrowClockwise size={20} weight="bold" />
                            </button>
                            <button onClick={() => toggleImageTransform('rotate180')} title="Rotate 180°">
                                <ArrowClockwise size={20} weight="bold" style={{ transform: 'rotate(180deg)' }} />
                            </button>
                        </div>
                    ) : selectedId && elements.find(el => el.id === selectedId)?.type === 'text' ? (
                        <div className="toolbar-group styling-controls">
                            <button
                                onMouseDown={(e) => editingTextId === selectedId && e.preventDefault()}
                                onClick={() => toggleStyle('bold')}
                                className={
                                    editingTextId === selectedId
                                        ? (typeof document !== 'undefined' && document.queryCommandState?.('bold') ? 'active' : '')
                                        : (elements.find(el => el.id === selectedId).fontWeight === 'bold' ? 'active' : '')
                                }
                                title="Bold (highlight text and click)"
                            >
                                <TextB size={20} weight="bold" />
                            </button>
                            <button
                                onClick={() => toggleStyle('italic')}
                                className={elements.find(el => el.id === selectedId).fontStyle === 'italic' ? 'active' : ''}
                                title="Italic"
                            >
                                <TextItalic size={20} weight="bold" />
                            </button>
                            <button
                                onClick={() => toggleStyle('underline')}
                                className={elements.find(el => el.id === selectedId).textDecoration === 'underline' ? 'active' : ''}
                                title="Underline"
                            >
                                <TextUnderline size={20} weight="bold" />
                            </button>

                            <div className="font-size-control">
                                <button onClick={() => handleFontSizeChange(-2)} title="Decrease Size">-</button>
                                <span className="size-display">{elements.find(el => el.id === selectedId).fontSize}</span>
                                <button onClick={() => handleFontSizeChange(2)} title="Increase Size">+</button>
                            </div>

                            <button onClick={() => toggleStyle('left')} className={elements.find(el => el.id === selectedId).textAlign === 'left' ? 'active' : ''}><TextAlignLeft size={20} /></button>
                            <button onClick={() => toggleStyle('center')} className={elements.find(el => el.id === selectedId).textAlign === 'center' ? 'active' : ''}><TextAlignCenter size={20} /></button>
                            <button onClick={() => toggleStyle('right')} className={elements.find(el => el.id === selectedId).textAlign === 'right' ? 'active' : ''}><TextAlignRight size={20} /></button>

                            <button onClick={() => toggleStyle('top')} className={elements.find(el => el.id === selectedId).alignItems === 'flex-start' ? 'active' : ''}><AlignTop size={20} /></button>
                            <button onClick={() => toggleStyle('middle')} className={elements.find(el => el.id === selectedId).alignItems === 'center' ? 'active' : ''}><AlignCenterVertical size={20} /></button>
                            <button onClick={() => toggleStyle('bottom')} className={elements.find(el => el.id === selectedId).alignItems === 'flex-end' ? 'active' : ''}><AlignBottom size={20} /></button>
                        </div>
                    ) : (
                        <div className="toolbar-placeholder flex-1"></div>
                    )}

                    <div className="toolbar-group">
                        <button
                            onClick={() => selectedId && deleteElement(selectedId)}
                            className="delete-btn"
                            title="Delete Selected"
                            disabled={!selectedId}
                        >
                            <Trash size={24} weight="bold" />
                            <span>Delete</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Canvas */}
            {/* Canvas Container for Scrolling */}
            <div className="canvas-scroll-container">
                <div
                    ref={canvasRef}
                    className="editor-canvas"
                    style={{ width: canvasSize.width, height: canvasSize.height }}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onClick={(e) => {
                        if (e.target === canvasRef.current) {
                            setSelectedId(null);
                            setEditingTextId(null);
                        }
                    }}
                >
                    {elements.length === 0 && (
                        <div className="canvas-placeholder">
                            <ArrowsOutCardinal size={48} weight="light" />
                            <p>Add elements using the toolbar above</p>
                            <p className="hint">Drag to move, corner to resize</p>
                        </div>
                    )}

                    {elements.map(element => (
                        <div
                            key={element.id}
                            className={`canvas-element ${element.type} ${selectedId === element.id ? 'selected' : ''}`}
                            style={{
                                left: element.x,
                                top: element.y,
                                width: element.width,
                                height: element.height
                            }}
                            onMouseDown={(e) => handleMouseDown(e, element.id)}
                            onClick={(e) => handleTextClick(e, element)}
                            onDoubleClick={(e) => handleTextDoubleClick(e, element)}
                        >
                            {element.type === 'text' && (
                                editingTextId === element.id ? (
                                    <div
                                        key={`${element.id}-edit`}
                                        ref={el => { if (editingTextId === element.id) textEditRef.current = el; }}
                                        className="text-editor contenteditable-text"
                                        contentEditable
                                        suppressContentEditableWarning
                                        onInput={(e) => handleTextChange(e, element.id)}
                                        onBlur={handleTextBlur}
                                        onPaste={handleRichTextPaste}
                                        style={{
                                            fontSize: element.fontSize,
                                            fontWeight: element.fontWeight,
                                            fontStyle: element.fontStyle,
                                            textDecoration: element.textDecoration
                                        }}
                                        onMouseDown={(e) => e.stopPropagation()}
                                        onKeyDown={(e) => {
                                            e.stopPropagation();
                                            if (e.key === ' ') {
                                                e.preventDefault();
                                                document.execCommand('insertText', false, ' ');
                                            }
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.execCommand('insertLineBreak');
                                            }
                                        }}
                                    />
                                ) : (
                                    <div
                                        key={`${element.id}-preview`}
                                        className="text-preview"
                                        style={{
                                            fontSize: element.fontSize,
                                            fontWeight: element.fontWeight,
                                            fontStyle: element.fontStyle,
                                            textDecoration: element.textDecoration,
                                            justifyContent: element.justifyContent || 'center',
                                            alignItems: element.alignItems || 'center',
                                            textAlign: element.textAlign || 'center'
                                        }}
                                    >
                                        {element.content && /<[a-z]/.test(element.content) ? (
                                            <span dangerouslySetInnerHTML={{ __html: sanitizeHtml(element.content) }} />
                                        ) : (
                                            element.content
                                        )}
                                    </div>
                                )
                            )}

                            {element.type === 'image' && (
                                <img
                                    src={element.content}
                                    alt="Content"
                                    className="element-content"
                                    draggable={false}
                                    style={{
                                        transform: [
                                            `scaleX(${element.flipHorizontal ? -1 : 1})`,
                                            `scaleY(${element.flipVertical ? -1 : 1})`,
                                            `rotate(${element.rotation || 0}deg)`
                                        ].join(' ')
                                    }}
                                />
                            )}

                            {element.type === 'video' && (
                                <div className="video-placeholder">
                                    <VideoCamera size={32} />
                                    <span>Video</span>
                                </div>
                            )}

                            {/* Resize Handles */}
                            {selectedId === element.id && (
                                <>
                                    <div className="resize-handle nw" onMouseDown={(e) => handleResizeStart(e, 'nw')} />
                                    <div className="resize-handle ne" onMouseDown={(e) => handleResizeStart(e, 'ne')} />
                                    <div className="resize-handle se" onMouseDown={(e) => handleResizeStart(e, 'se')} />
                                    <div className="resize-handle sw" onMouseDown={(e) => handleResizeStart(e, 'sw')} />
                                </>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ContentEditor;
