import { ArrowLeft } from '@phosphor-icons/react';
import ContentRenderer from './ContentRenderer';

const ShopItemView = ({ item, onBack }) => {
    return (
        <div className="shop-item-view">
            <div className="view-header">
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">{item.title}</h1>
                <div className="header-spacer"></div>
            </div>

            <div className="view-content" style={{ display: 'grid', placeItems: 'center', overflow: 'auto', padding: '2rem' }}>
                <ContentRenderer
                    content={item.content}
                    width={item.canvas_width}
                    height={item.canvas_height}
                />
            </div>
        </div>
    );
};

export default ShopItemView;
