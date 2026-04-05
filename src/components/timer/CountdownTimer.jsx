import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, notification, Tooltip, Radio, Row, Col, List, Typography, Card } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, PlusCircleOutlined, MinusCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { showNotification } from '../../common/utils';

const { Title, Text } = Typography;

const CountdownTimer = () => {
    const [mins, setMins] = useState(30); // Initial 30 minutes
    const [remainingTime, setRemainingTime] = useState(mins * 60 * 1000);
    const [isPaused, setIsPaused] = useState(true);
    const [hasNotified, setHasNotified] = useState(false);
    const timerRef = useRef(null);

    const [data, setData] = useState([]);

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
    }, [mins]);

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
        console.log("Play Sound start", new Date().toISOString());
        const newData = [{ time: mins, completedAt: new Date().toLocaleString() }, ...data];
        setData(newData);
        const audio = new Audio('/my-buddy/assets/simple-notification-152054.mp3'); // Path to your sound file
        audio.play().catch(error => {
            console.error('Error playing sound:', error);
        });
        console.log("Play Sound end", new Date().toISOString());
    };

    const openNotification = () => {
        notification.open({
            message: 'Timer Complete',
            description: 'Time to take a break!',
        });

        showNotification('Time Up ⏰', "Time to take a break!");
    };

    return (
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <Card style={{
                background: 'var(--color-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--color-border-light)',
                boxShadow: 'var(--shadow-md)',
            }}>
                {/* Timer Display */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--color-primary-light) 0%, #f0f9ff 100%)',
                    borderRadius: 'var(--radius-md)',
                    padding: 'var(--space-xl)',
                    textAlign: 'center',
                    marginBottom: 'var(--space-lg)',
                    border: '1px solid var(--color-border-light)',
                }}>
                    <Text type="secondary" style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>Take a Break in</Text>
                    <div style={{
                        fontSize: 52,
                        fontWeight: 700,
                        letterSpacing: '-0.03em',
                        fontFamily: 'var(--font-mono)',
                        color: remainingTime === 0 ? 'var(--color-danger)' : 'var(--color-text)',
                        lineHeight: 1.2,
                        margin: 'var(--space-sm) 0',
                    }}>
                        {formatTime(remainingTime)}
                    </div>
                </div>

                {/* Controls */}
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={14}>
                        <Text type="secondary" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-sm)' }}>
                            Offset
                        </Text>
                        <Radio.Group value={offset} onChange={(e) => setOffset(e.target.value)} style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                            <Tooltip title="1 min offset"><Radio.Button value={1}>1m</Radio.Button></Tooltip>
                            <Tooltip title="5 min offset"><Radio.Button value={5}>5m</Radio.Button></Tooltip>
                            <Tooltip title="15 min offset"><Radio.Button value={15}>15m</Radio.Button></Tooltip>
                        </Radio.Group>
                    </Col>
                    <Col xs={24} md={10}>
                        <Text type="secondary" style={{ fontSize: 'var(--text-sm)', fontWeight: 500, display: 'block', marginBottom: 'var(--space-sm)' }}>
                            Minutes
                        </Text>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                            <Tooltip title="Remove offset from minutes">
                                <Button onClick={() => setMins(mins - offset)} icon={<MinusCircleOutlined />} shape="circle" />
                            </Tooltip>
                            <Input
                                placeholder="Mins"
                                type="number"
                                value={mins}
                                onChange={(e) => setMins(Number(e.target.value))}
                                style={{ width: 80, textAlign: 'center', fontWeight: 600 }}
                            />
                            <Tooltip title="Add offset to minutes">
                                <Button onClick={() => setMins(mins + offset)} icon={<PlusCircleOutlined />} shape="circle" />
                            </Tooltip>
                        </div>
                    </Col>
                </Row>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 'var(--space-sm)', marginTop: 'var(--space-lg)' }}>
                    <Tooltip title="Reset Timer to minutes">
                        <Button onClick={handleReset} icon={<ReloadOutlined />} style={{ flex: 1 }}>
                            Reset
                        </Button>
                    </Tooltip>
                    <Tooltip title={isPaused ? "Start the Timer" : "Pause the Timer"}>
                        <Button
                            onClick={() => (isPaused ? handlePlay() : handlePause())}
                            type={isPaused ? 'primary' : 'default'}
                            icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                            style={{ flex: 1 }}
                        >
                            {isPaused ? 'Play' : 'Pause'}
                        </Button>
                    </Tooltip>
                </div>
            </Card>

            {/* Recent Timers Log */}
            {data.length > 0 && (
                <div style={{ marginTop: 'var(--space-lg)' }}>
                    <List
                        style={{
                            background: 'var(--color-surface)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid var(--color-border-light)',
                            boxShadow: 'var(--shadow-sm)',
                        }}
                        header={
                            <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                                <ClockCircleOutlined /> Recent Timers
                            </div>
                        }
                        size='small'
                        bordered
                        dataSource={data}
                        renderItem={(item, index) => (
                            <List.Item>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', width: '100%' }}>
                                    <span className="stat-pill" style={{ minWidth: 28, justifyContent: 'center' }}>#{index + 1}</span>
                                    <Text style={{ fontSize: 'var(--text-sm)' }}>
                                        {item.time} mins break completed at {item.completedAt}
                                    </Text>
                                </div>
                            </List.Item>
                        )}
                    />
                </div>
            )}
        </div>
    );
};

export default CountdownTimer;
