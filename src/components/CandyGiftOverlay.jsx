import { useEffect } from 'react';
import { Gift } from '@phosphor-icons/react';

/**
 * Full-screen overlay when admin adds candies to the user. Card style: icon, title, subtitle, description, button.
 */
const CandyGiftOverlay = ({ amount, onDismiss, autoDismissMs }) => {
    useEffect(() => {
        if (autoDismissMs && autoDismissMs > 0) {
            const t = setTimeout(onDismiss, autoDismissMs);
            return () => clearTimeout(t);
        }
    }, [autoDismissMs, onDismiss]);

    return (
        <div className="candy-gift-overlay" role="alert" aria-live="polite">
            <div className="candy-gift-content">
                <div className="candy-gift-header">
                    <div className="candy-gift-icon-wrap">
                        <Gift size={32} weight="fill" color="#ff6b9d" />
                    </div>
                    <div className="candy-gift-heading">
                        <h1 className="candy-gift-title">Sweet surprise!</h1>
                        <p className="candy-gift-desc">Admin sent you {amount} candies</p>
                    </div>
                </div>
                <button type="button" className="candy-gift-dismiss" onClick={onDismiss}>
                    OK
                </button>
            </div>
        </div>
    );
};

export default CandyGiftOverlay;
