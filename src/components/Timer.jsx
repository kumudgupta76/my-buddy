import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, notification, Tooltip, Radio, Typography, Card } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const Timer = () => {
    const [mins, setMins] = useState(30); // Initial 30 minutes
    const [remainingTime, setRemainingTime] = useState(mins * 60 * 1000);
    const [isPaused, setIsPaused] = useState(true);
    const [hasNotified, setHasNotified] = useState(false);
    const timerRef = useRef(null);

    const [offset, setOffset] = useState(5) // Default offset 5 mins

    useEffect(() => {
        if (!isPaused) {
            const start = Date.now();
            const end = start + remainingTime;
            timerRef.current = setInterval(() => {
                const now = Date.now();
                const timeLeft = end - now;
                if (timeLeft <= 0) {
                    clearInterval(timerRef.current);
                    setRemainingTime(0);
                    if (!hasNotified) {
                        playSound();
                        openNotification();
                        setHasNotified(true);
                    }
                } else {
                    setRemainingTime(timeLeft);
                }
            }, 1000);
        }

        return () => clearInterval(timerRef.current);
    }, [isPaused, remainingTime, hasNotified]);

    useEffect(() => {
        handleReset();
    }, [mins])

    const handlePause = () => {
        setIsPaused(true);
        clearInterval(timerRef.current);
    };

    const handlePlay = () => {
        setIsPaused(false);
        setHasNotified(false); // Reset notification flag when playing
    };

    const handleReset = () => {
        setIsPaused(false);
        setRemainingTime(mins * 60 * 1000);
        setHasNotified(false); // Reset notification flag when resetting
    };

    const formatTime = (milliseconds) => {
        const totalSeconds = Math.floor(milliseconds / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const playSound = () => {
        const audio = new Audio('/my-buddy/assets/simple-notification-152054.mp3'); // Path to your sound file
        audio.play().catch(error => {
            console.error('Error playing sound:', error);
        });
    };

    const openNotification = () => {
        notification.open({
            message: 'Timer Complete',
            description: 'Time to take a break!',
        });
    };

    return (
        <div style={{ maxWidth: 400, margin: '0 auto' }}>
            <Card style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-md)',
            }}>
                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <Text type="secondary" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-sm)', display: 'block' }}>Offset</Text>
                    <Radio.Group value={offset} onChange={(e) => setOffset(e.target.value)} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                        <Tooltip title="1 min offset"><Radio.Button value={1}>1m</Radio.Button></Tooltip>
                        <Tooltip title="5 min offset"><Radio.Button value={5}>5m</Radio.Button></Tooltip>
                        <Tooltip title="15 min offset"><Radio.Button value={15}>15m</Radio.Button></Tooltip>
                    </Radio.Group>
                </div>

                <div style={{ marginBottom: 'var(--space-lg)' }}>
                    <Text type="secondary" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 'var(--space-sm)', display: 'block' }}>Minutes</Text>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                        <Button onClick={() => setMins(mins - 1)} icon={<MinusCircleOutlined />} shape="circle" />
                        <Input
                            placeholder="Mins"
                            type="number"
                            value={mins}
                            onChange={(e) => setMins(Number(e.target.value))}
                            style={{ width: 100, textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-lg)' }}
                        />
                        <Button onClick={() => setMins(mins + 1)} icon={<PlusCircleOutlined />} shape="circle" />
                    </div>
                </div>

                <div style={{
                    background: 'var(--color-bg)',
                    padding: 'var(--space-lg)',
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    marginBottom: 'var(--space-lg)',
                    border: '1px solid var(--color-border-light)',
                }}>
                    <Text type="secondary" style={{ fontSize: 'var(--text-sm)', display: 'block', marginBottom: 'var(--space-xs)' }}>Take a Break in</Text>
                    <div style={{
                        fontSize: 40,
                        fontWeight: 700,
                        letterSpacing: '-0.02em',
                        fontFamily: 'var(--font-mono)',
                        color: remainingTime === 0 ? 'var(--color-danger)' : 'var(--color-text)',
                    }}>
                        {formatTime(remainingTime)}
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-sm)' }}>
                    <Button onClick={handleReset} icon={<ReloadOutlined />} style={{ flex: 1 }}>Reset</Button>
                    <Button
                        onClick={() => isPaused ? handlePlay() : handlePause()}
                        type={isPaused ? 'primary' : 'default'}
                        icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                        style={{ flex: 1 }}
                    >
                        {isPaused ? 'Play' : 'Pause'}
                    </Button>
                </div>
            </Card>
        </div>
    );
};

export default Timer;
