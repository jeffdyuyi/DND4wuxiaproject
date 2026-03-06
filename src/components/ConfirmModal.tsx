
import React from 'react';

interface ConfirmModalProps {
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({ message, onConfirm, onCancel }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                backgroundColor: '#fff',
                padding: '32px',
                borderRadius: '12px',
                maxWidth: '360px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>⚠️</div>
                <p style={{
                    fontSize: '16px',
                    color: '#2d3748',
                    marginBottom: '28px',
                    lineHeight: '1.6'
                }}>
                    {message}
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                        onClick={onCancel}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#f7fafc',
                            color: '#4a5568',
                            fontSize: '15px',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#edf2f7'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f7fafc'}
                    >
                        取消
                    </button>
                    <button
                        onClick={onConfirm}
                        style={{
                            padding: '10px 24px',
                            borderRadius: '8px',
                            border: 'none',
                            backgroundColor: '#c0392b',
                            color: '#fff',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#922b21'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#c0392b'}
                    >
                        确认删除
                    </button>
                </div>
            </div>
        </div>
    );
};
