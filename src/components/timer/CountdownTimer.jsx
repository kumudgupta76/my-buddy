import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, notification, Tooltip, Radio, Row, Col, List, Typography } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';

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
    };

    return (
        <>
            <Row>
                <Col sm={0} md={6}></Col>
                <Col sm={24} md={12} style={{ background: "#ebc0a636", padding: "10px", border: "1px solid #d9d9d9" }}>
                    <Row>
                        <Col sm={24} md={12} style={{ padding: "5px" }}>
                            Offset Value For Minute
                        </Col>
                        <Col sm={24} md={12}>
                            <Radio.Group value={offset} onChange={(e) => setOffset(e.target.value)} style={{ marginBottom: "10px" }}>
                                <Tooltip title="1 min offset"><Radio.Button value={1} style={{ marginRight: '10px' }}>1 min</Radio.Button></Tooltip>
                                <Tooltip title="5 min offset"><Radio.Button value={5} style={{ marginRight: '10px' }}>5 min</Radio.Button></Tooltip>
                                <Tooltip title="15 min offset"><Radio.Button value={15}>15 min</Radio.Button></Tooltip>
                            </Radio.Group>
                        </Col>
                    </Row>

                    <Row style={{ marginBottom: '10px' }}>
                        <Col sm={24} md={12} style={{ padding: "5px" }}>
                            Minute
                        </Col>
                        <Col sm={24} md={12}>
                            <Tooltip title="Remove offset from minutes">
                                <Button onClick={() => setMins(mins - offset)} style={{ marginRight: '10px' }}>
                                    <MinusCircleOutlined />
                                </Button>
                            </Tooltip>
                            <Input
                                placeholder="Mins"
                                type="number"
                                value={mins}
                                onChange={(e) => setMins(Number(e.target.value))}
                                style={{ width: '113px', marginRight: '10px' }}
                            />
                            <Tooltip title="Add offset to minutes">
                                <Button onClick={() => setMins(mins + offset)}>
                                    <PlusCircleOutlined />
                                </Button>
                            </Tooltip>
                        </Col>
                    </Row>

                    <Row style={{ marginBottom: '10px' }}>
                        <Col sm={24} md={12}></Col>
                        <Col sm={24} md={12}>
                            <div style={{
                                backgroundColor: 'white',
                                padding: '10px',
                                borderRadius: '5px',
                                boxShadow: '0 0 10px rgba(0,0,0,0.1)',
                                border: "1px solid  #d9d9d9"
                            }}>
                                <div>Take a Break in</div>
                                <div style={{ fontSize: '30px' }}>{formatTime(remainingTime)}
                                </div>
                            </div>
                        </Col>
                    </Row>

                    <Row style={{ marginBottom: '10px' }}>
                        <Col md={12} style={{ padding: "5px" }}>
                            Actions
                        </Col>
                        <Col md={12}>
                            <Tooltip title="Reset Timer to minutes"><Button onClick={handleReset} style={{ width: '100px', marginRight: '10px' }}>Reset<ReloadOutlined /></Button></Tooltip>
                            <Tooltip title="Pause the Timer">
                                <Button style={{width:"100px"}} onClick={() => isPaused ? handlePlay() : handlePause()}>{isPaused ? "Play" : "Pause"} {
                                    isPaused ? <PlayCircleOutlined />
                                        : <PauseCircleOutlined />
                                }</Button>
                            </Tooltip>
                        </Col>
                    </Row>
                </Col>
                <Col sm={0} md={6}></Col>
            </Row>
            <List style={{ marginTop: "30px" }}
                header={<strong>Recent Timers</strong>}
                size='large'
                bordered
                dataSource={data}
                renderItem={(item, index) => (
                    <List.Item>
                        <Typography.Text>{`#${index + 1} ${item.time} mins break completed at ${item.completedAt}`}</Typography.Text>
                    </List.Item>
                )}
            />
        </>
    );
};

export default CountdownTimer;
