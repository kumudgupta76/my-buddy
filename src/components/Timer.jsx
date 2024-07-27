import React, { useState, useEffect } from 'react';
import { Button, Statistic, Input, notification } from 'antd';
import {PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, PlusCircleOutlined, MinusCircleOutlined} from '@ant-design/icons';
const { Countdown } = Statistic;


const Timer = () => {
    const [mins, setMins] = useState(30);// Initial 30 minutes
    const [deadline, setDeadline] = useState(Date.now() + mins * 60 * 1000); 
    const [isPaused, setIsPaused] = useState(false);
    const [remainingTime, setRemainingTime] = useState(deadline - Date.now());

    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setRemainingTime(deadline - Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, [deadline, isPaused]);

    const handleReset = () => {
        setDeadline(Date.now() + mins * 60 * 1000);
        setIsPaused(false);
        setRemainingTime(mins * 60 * 1000);
    };

    const playSound = () => {
        const audio = new Audio('/simple-notification-152054.mp3'); // Path to your sound file
        audio.play().catch(error => {
          console.error('Error playing sound:', error);
        });
      };
    const handlePause = () => {
        setIsPaused(true);
    };

    const handleResume = () => {
        setIsPaused(false);
    };

    return (
        <div style={{ position: 'fixed', bottom: '10px', right: '10px', zIndex: 1000 }}>
            <div style={{ marginBottom: '0px' }}>
                <Button onClick={() => setMins(mins+1)} style={{ marginRight: '10px' }}>
                    <PlusCircleOutlined></PlusCircleOutlined>
                </Button>
                <Input
                    placeholder="Mins"
                    type="number"
                    value={mins}
                    onChange={(e) => setMins(e.target.value)}
                    style={{ marginBottom: '10px', width: '50px',marginRight: '10px' }}
                />
                <Button onClick={() => setMins(mins-1)} >
                    <MinusCircleOutlined></MinusCircleOutlined>
                </Button>
            </div>
            <Countdown
                title="Take a Break in"
                value={Date.now() + remainingTime}
                onFinish={() => {
                    notification.info({
                        message: 'Time to take a break',
                        description: `You have been working for last ${mins} min`,
                        duration:10
                      });
                    handleReset(); // Reset timer when finished
                    playSound();
                    handlePause();
                }}
                format="mm:ss"
                style={{
                    backgroundColor: 'white',
                    padding: '10px',
                    borderRadius: '5px',
                    boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                }}
            />
            <div style={{ marginTop: '10px' }}>
                <Button onClick={handleReset} style={{ marginRight: '10px' }}>
                <ReloadOutlined />
                </Button>
                <Button onClick={isPaused ? handleResume : handlePause}>
                    {isPaused ? <PlayCircleOutlined></PlayCircleOutlined> : <PauseCircleOutlined></PauseCircleOutlined>}
                </Button>
            </div>
        </div>
    );
};

export default Timer;

