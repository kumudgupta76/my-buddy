import React, { useState, useEffect } from 'react';
import { Table, Input, Row, Col, Button, Space, message, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, CopyOutlined } from '@ant-design/icons';
import { copyToClipboard } from '../../common/utils';

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

  const handleCopy = (key) => {
    let textToCopy = JSON.stringify(data.find(d => d.key === key).value);
    copyToClipboard(textToCopy);
  }

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
      width: '50%',
    },
    // {
    //   title: 'Value',
    //   dataIndex: 'value',
    //   key: 'value',
    // },
    {
      title: 'Actions',
      key: 'actions',
      fixed: 'right',
      width: "50%",
      render: (_, record) => (
        <Space>
          <Tooltip title="Copy Entry">
            <Button
              icon={<CopyOutlined />}
              onClick={() => handleCopy(record.key)}
            />
          </Tooltip>
          <Tooltip title="Edit Entry">
            <Button
              icon={<EditOutlined />}
              onClick={() => handleEdit(record.key)}
            /></Tooltip>
          <Tooltip title="Delete Entry">
            <Button
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.key)}
              danger
            />
          </Tooltip>

        </Space>
      ),
    },
  ];
  const [backupString, setBackupString] = useState('');

  const handleBackup = () => {
    const backup = backupLocalStorage();
    setBackupString(backup);
    copyToClipboard(backup);
  };

  const handleRestore = () => {
    restoreLocalStorage(backupString);
    alert('LocalStorage has been restored.');
  };
  function backupLocalStorage() {
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      backup[key] = value;
    }
    return JSON.stringify(backup);
  }

  function restoreLocalStorage(backupString) {
    const backup = JSON.parse(backupString);
    for (const key in backup) {
      if (backup.hasOwnProperty(key)) {
        localStorage.setItem(key, backup[key]);
      }
    }
  }

  const handleBackupJson = () => {
    // Retrieve all keys and values from localStorage
    const allData = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      const value = localStorage.getItem(key);
      allData[key] = value;
    }

    // Convert the data into a JSON string
    const jsonData = JSON.stringify(allData, null, 2);

    // Create a Blob from the JSON string
    const blob = new Blob([jsonData], { type: 'application/json' });

    // Create a download link programmatically without appending it to the document
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'localStorageBackup.json'; // Name the file

    // Trigger the download
    link.click();
  };

  // Function to handle the restore (reading the uploaded file)
  const handleRestoreJson = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const restoredData = JSON.parse(reader.result);
          // Restore each key-value pair from the JSON data into localStorage
          for (const key in restoredData) {
            if (restoredData.hasOwnProperty(key)) {
              localStorage.setItem(key, restoredData[key]);
            }
          }
          alert('Data restored successfully!');
        } catch (error) {
          alert('Error: Invalid JSON file.');
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div style={{ maxWidth: '100%', overflowX: 'auto' }}>
      <Row gutter={[16, 16]}>
        <Col md={24}>
          <Space>
            <Button onClick={handleBackup}>Backup localStorage</Button>
            <Button onClick={handleRestore}>Restore localStorage</Button>

            <Button onClick={handleBackupJson}>Backup localStorage to Json File</Button>
            <Button onClick={() => document.getElementById('restoreFileInput').click()}>Restore localStorage from Json File</Button>
          </Space>
        </Col>
        <Col md={24}>
          {/* Button for restore (file input hidden) */}
          <input
            type="file"
            accept=".json"
            onChange={handleRestoreJson}
            style={{ display: 'none' }} // Hidden input to trigger the file selection dialog
            id="restoreFileInput"
          />
        </Col>
        <Col md={24}>
          <TextArea
            value={backupString}
            onChange={(e) => setBackupString(e.target.value)}
            rows="3"
            placeholder='Paste backup string here'
            width="100%"
          />
        </Col>
      </Row>
      <h3>Local Store Data</h3>
      <Table dataSource={data} columns={columns} rowKey="key" expandable={{expandedRowRender: (record) => {
        return (
          <p style={{ margin: 0 }}>{JSON.stringify(record.value)}</p>
        );
      }}}/>

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
          <Button style={{ marginLeft: "10px" }} type="info" onClick={() => setEditKey(null)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
};

export default LocalStorageManager;
