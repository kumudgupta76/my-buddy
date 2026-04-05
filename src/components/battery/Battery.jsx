import { Col, Row, Typography, Progress, Spin } from 'antd'
import React, { useEffect, useState } from 'react'
import { LoadingOutlined, ThunderboltOutlined } from '@ant-design/icons';
const { Title, Text } = Typography;

const Cal = () => {
  const conicColors = {
    '0%': '#ef4444',
    '50%': '#f59e0b',
    '100%': '#10b981'
  }

  const [value, setValue] = useState(() => 0)
  const [batterySupported, setBatterySupported] = useState(() => true)

  useEffect(() => {
    const intervalId = setInterval(() => {
      // Call your method here
      myMethod()
    }, 1000) // Interval of 1000 milliseconds (1 seconds)

    // Clear the interval when the component unmounts
    return () => clearInterval(intervalId)
  }, []) // Empty dependency array to run this effect only once when the component mounts

  // Method to be called at the interval
  const myMethod = () => {
    console.log('Method called every 5 seconds')
    // Add your method logic here

    if ('getBattery' in navigator) {
      navigator.getBattery().then(function (battery) {
        // Update battery status initially
        updateBatteryStatus(battery)

        // Update battery status whenever it changes
        battery.addEventListener('chargingchange', function () {
          updateBatteryStatus(battery)
        })

        battery.addEventListener('levelchange', function () {
          updateBatteryStatus(battery)
        })
      })

      function updateBatteryStatus(battery) {
        var percentage = Math.round(battery.level * 100)
        setValue(percentage)
      }
    } else {
      setBatterySupported(false)
    }
  }

  return (
    <div className='outer-container'>
      {
        batterySupported ?
          value === 0 ? (
            <div className="loading-container">
              <Spin
                indicator={
                  <LoadingOutlined
                    style={{ fontSize: 48, color: 'var(--color-primary)' }}
                    spin
                  />
                }
              />
              <Text type="secondary">Reading battery status...</Text>
            </div>
          ) : (
            <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
              <div style={{ marginBottom: 'var(--space-lg)' }}>
                <ThunderboltOutlined style={{ fontSize: 24, color: 'var(--color-primary)', marginBottom: 'var(--space-sm)' }} />
                <Title level={4} style={{ margin: 0 }}>Battery Status</Title>
              </div>
              <div className="info-card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
                <Progress type='dashboard' percent={value} strokeColor={conicColors} size='default' strokeWidth={8} />
              </div>
              <div className="info-card" style={{ padding: 'var(--space-lg)' }}>
                <Progress steps={5} percent={value} strokeWidth={24} />
              </div>
            </div>
          )
          : (
            <div className="empty-state">
              <ThunderboltOutlined className="empty-state-icon" />
              <Title level={4} style={{ color: 'var(--color-text-muted)' }}>Battery Status API not supported</Title>
              <Text type="secondary">Your browser doesn't support the Battery Status API</Text>
            </div>
          )
      }
    </div>
  )
}
export default Cal
