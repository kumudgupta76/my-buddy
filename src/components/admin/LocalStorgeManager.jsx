import React, { useState, useEffect } from 'react';
import { Table, Input, Button, Space, message,Typography, } from 'antd';
const { TextArea } = Input;

const LocalStorageManager = () => {
  const [data, setData] = useState([]);
  const [editKey, setEditKey] = useState(null);
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Load all key-value pairs from localStorage
    const localData = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      localData.push({ key, value });
    }
    setData(localData);
  }, []);

  const handleEdit = (key) => {
    setEditKey(key);
    const item = data.find(d => d.key === key);
    if (item) {
      setInputValue(item.value);
    }
  };

  const handleSave = () => {
    localStorage.setItem(editKey, inputValue);
    const newData = data.map(item =>
      item.key === editKey ? { ...item, value: inputValue } : item
    );
    setData(newData);
    message.success('Data updated successfully!');
    setEditKey(null);
    setInputValue('');
  };

  const handleDelete = (key) => {
    localStorage.removeItem(key);
    const newData = data.filter(item => item.key !== key);
    setData(newData);
    message.success('Data deleted successfully!');
  };

  const columns = [
    {
      title: 'Key',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: 'Value',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button onClick={() => handleEdit(record.key)}>Edit</Button>
          <Button onClick={() => handleDelete(record.key)} danger>
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '20px' }}>
        <h3>Local Store Data</h3>
      <Table dataSource={data} columns={columns} rowKey="key" />

      {editKey !== null && (
        <div style={{ marginTop: '20px' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Edit value"
            style={{ width: '300px', marginRight: '10px' }}
          />
          <Button type="primary" onClick={handleSave}>
            Save
          </Button>
          <Button style={{marginLeft:"10px"}} type="info" onClick={() => setEditKey(null)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default LocalStorageManager;
