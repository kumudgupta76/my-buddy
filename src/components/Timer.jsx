import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, notification, Tooltip, Radio } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';

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
        <div style={{ bottom: '10px', right: '10px', zIndex: 1000 }}>
            <div style={{ marginBottom: '10px' }}>
                <Radio.Group value={offset} onChange={(e) => setOffset(e.target.value)} style={{ display: "flex", justifyContent: "space-between" }}>
                    <Tooltip title="1 min offset"><Radio.Button value={1} style={{ marginRight: '10px' }}>1 min</Radio.Button></Tooltip>
                    <Tooltip title="5 min offset"><Radio.Button value={5} style={{ marginRight: '10px' }}>5 min</Radio.Button></Tooltip>
                    <Tooltip title="15 min offset"><Radio.Button value={15}>15 min</Radio.Button></Tooltip>
                </Radio.Group>
            </div>

            <div style={{ marginBottom: '10px', display: "flex", justifyContent: "space-between" }}>
                <Button onClick={() => setMins(mins - 1)} style={{ marginRight: '10px' }}>
                    <MinusCircleOutlined />
                </Button>
                <Input
                    placeholder="Mins"
                    type="number"
                    value={mins}
                    onChange={(e) => setMins(Number(e.target.value))}
                    style={{ width: '113px', marginRight: '10px' }}
                />
                <Button onClick={() => setMins(mins + 1)}>
                    <PlusCircleOutlined />
                </Button>
            </div>

            <div style={{
                backgroundColor: 'white',
                padding: '10px',
                borderRadius: '5px',
                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
            }}>
                <div>Take a Break in</div>
                <div style={{ fontSize: '30px' }}>{formatTime(remainingTime)}
                </div>
            </div>
            <div style={{ marginTop: '10px', display: "flex", alignContent: "space-between" }}>
                <Button onClick={handleReset} style={{ width: '50px', marginRight: '10px' }}><ReloadOutlined /></Button>
                <Button onClick={() => isPaused ? handlePlay() : handlePause()}>{isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}</Button>
            </div>
        </div>
    );
};

export default Timer;
