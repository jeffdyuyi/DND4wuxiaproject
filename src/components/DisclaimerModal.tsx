
import React from 'react';

interface DisclaimerModalProps {
    onClose: () => void;
}

export const DisclaimerModal: React.FC<DisclaimerModalProps> = ({ onClose }) => {
    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(5px)'
        }}>
            <div style={{
                backgroundColor: '#fff',
                padding: '40px',
                borderRadius: '16px',
                maxWidth: '500px',
                width: '90%',
                textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                animation: 'fadeIn 0.3s ease-out'
            }}>
                <h2 style={{
                    fontSize: '28px',
                    marginBottom: '20px',
                    color: '#1a202c',
                    borderBottom: '2px solid #e2e8f0',
                    paddingBottom: '16px'
                }}>
                    欢迎使用 吾侠
                </h2>

                <div style={{ marginBottom: '30px', color: '#4a5568', lineHeight: '1.6' }}>
                    <p style={{ marginBottom: '16px', fontSize: '18px' }}>
                        <span style={{ fontWeight: 'bold', color: '#2d3748' }}>作者：</span>
                        不咕鸟（基德）
                    </p>
                    <p style={{ marginBottom: '16px', fontSize: '18px' }}>
                        <span style={{ fontWeight: 'bold', color: '#2d3748' }}>组织：</span>
                        成都秘密基地TRPG跑团群
                        <br />
                        <span style={{ color: '#3182ce', fontWeight: 'bold' }}>691707475</span>
                    </p>

                    <div style={{
                        backgroundColor: '#fee2e2',
                        color: '#c53030',
                        padding: '16px',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: 'bold',
                        marginTop: '24px'
                    }}>
                        ⚠️ 免责声明：<br />
                        本工具仅供个人学习和娱乐使用，严禁商业用途。
                    </div>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        backgroundColor: '#3182ce',
                        color: 'white',
                        padding: '12px 32px',
                        borderRadius: '8px',
                        border: 'none',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        outline: 'none'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2c5282'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3182ce'}
                >
                    我已了解，进入江湖
                </button>
            </div>
        </div>
    );
};
