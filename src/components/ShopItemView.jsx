import { motion } from 'framer-motion';
import { ArrowLeft } from '@phosphor-icons/react';
import ContentRenderer from './ContentRenderer';

const t = { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] };

const ShopItemView = ({ item, onBack }) => {
    return (
        <motion.div
            className="shop-item-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={t}
        >
            <motion.div
                className="view-header"
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t, delay: 0.08 }}
            >
                <button className="back-btn" onClick={onBack}>
                    <ArrowLeft size={24} weight="bold" />
                </button>
                <h1 className="page-title">{item.title}</h1>
                <div className="header-spacer"></div>
            </motion.div>

            <motion.div
                className="view-content"
                style={{ display: 'grid', placeItems: 'center', overflow: 'auto', padding: '2rem' }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...t, delay: 0.15 }}
            >
                <ContentRenderer
                    content={item.content}
                    width={item.canvas_width}
                    height={item.canvas_height}
                />
            </motion.div>
        </motion.div>
    );
};

export default ShopItemView;
