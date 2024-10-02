import React, { useState, useEffect, useRef } from 'react';
import { Button, Input, notification, Tooltip, Radio, Row, Col, List, Typography, Card } from 'antd';
import { PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, PlusCircleOutlined, MinusCircleOutlined } from '@ant-design/icons';
import { showNotification } from '../../common/utils';

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
        <>
            <Row>
                <Col xs={24} md={6}></Col>
                <Col xs={24} md={12}>
                    <Card style={{ background: "#f9f9f9", padding: "20px", border: "1px solid #d9d9d9", borderRadius: "8px", boxShadow: "0 2px 10px rgba(0,0,0,0.1)" }}>
                        <Row justify="center">
                            <Col xs={24} md={12}>
                                <Typography.Title level={5}>Offset Value For Minute</Typography.Title>
                                <Radio.Group value={offset} onChange={(e) => setOffset(e.target.value)} style={{ marginBottom: "20px" }}>
                                    <Tooltip title="1 min offset"><Radio.Button value={1}>1 min</Radio.Button></Tooltip>
                                    <Tooltip title="5 min offset"><Radio.Button value={5}>5 min</Radio.Button></Tooltip>
                                    <Tooltip title="15 min offset"><Radio.Button value={15}>15 min</Radio.Button></Tooltip>
                                </Radio.Group>
                            </Col>
                            <Col xs={24} md={6}>
                                <Typography.Title level={5}>Minute</Typography.Title>
                                <div style={{ display: 'flex', alignItems: 'center', marginBottom: "20px" }}>
                                    <Tooltip title="Remove offset from minutes">
                                        <Button onClick={() => setMins(mins - offset)} style={{ marginRight: '10px' }} icon={<MinusCircleOutlined />} />
                                    </Tooltip>
                                    <Input
                                        placeholder="Mins"
                                        type="number"
                                        value={mins}
                                        onChange={(e) => setMins(Number(e.target.value))}
                                        style={{ width: '113px', marginRight: '10px' }}
                                    />
                                    <Tooltip title="Add offset to minutes">
                                        <Button onClick={() => setMins(mins + offset)} icon={<PlusCircleOutlined />} />
                                    </Tooltip>
                                </div>
                            </Col>
                        </Row>
                        <Row>
                            <Col xs={24} md={24}>
                                <Card style={{ marginBottom: '20px', padding: '10px', borderRadius: '5px', boxShadow: '0 0 10px rgba(0,0,0,0.1)' }}>
                                    <Typography.Title level={4}>Take a Break in</Typography.Title>
                                    <div style={{ fontSize: '30px', fontWeight: 'bold' }}>{formatTime(remainingTime)}</div>
                                </Card>
                            </Col>
                            <Col xs={24} md={24}>
                                <Typography.Title level={5}>Actions</Typography.Title>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <Tooltip title="Reset Timer to minutes">
                                        <Button onClick={handleReset} style={{ marginRight: '10px' }} icon={<ReloadOutlined />}>Reset</Button>
                                    </Tooltip>
                                    <Tooltip title="Pause the Timer">
                                        <Button onClick={() => (isPaused ? handlePlay() : handlePause())}>
                                            {isPaused ? "Play" : "Pause"} {isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                                        </Button>
                                    </Tooltip>
                                </div>
                            </Col>
                        </Row>
                    </Card>
                </Col>
                <Col xs={24} md={12}></Col>
            </Row>



            <List
                style={{ marginTop: "30px", border: "1px solid #d9d9d9", borderRadius: "8px" }}
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
