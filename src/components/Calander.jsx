import { Calendar, Col, Row, Typography } from "antd";
import { DatePicker } from 'antd';
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";

const month = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const CalendarComponent = () => {
  const [width, setWidth] = useState(window.innerWidth);

  function handleWindowSizeChange() {
    setWidth(window.innerWidth);
  }
  useEffect(() => {
    window.addEventListener("resize", handleWindowSizeChange);
    return () => {
      window.removeEventListener("resize", handleWindowSizeChange);
    };
  }, []);

  const isMobile = width <= 768;

  console.log(isMobile, window.innerWidth);

  function refreshTime() {
    const timeDisplay = document.getElementById("time-now");
    const dateString = new Date().toLocaleString();
    const formattedString = dateString.replace(", ", " - ");
    timeDisplay.textContent = "Today : " + formattedString;
  }
  setInterval(refreshTime, 1000);

  function onPanelChange(value, mode) {
    console.log(value, mode);
  }

  const [value, setValue] = useState(() => dayjs());

  const onChangeDate = (date, dateString) => {
    console.log(date, dateString);
    if(date)
    setValue(date);
  };
  return (
    <div className="outer-container">
    <Row>
      <Col style={{ width: "100%" }}>
      <Typography.Title level={2} className="container">{`${value}`}</Typography.Title>
        <DatePicker onChange={onChangeDate} />
      </Col>
      <Col>
        <Row>
          <Col span={12} xl={12} md={24} sm={24} xs={24}>
          <Typography.Title level={3} className="container">{`Current - ${month[value.month()]}`}</Typography.Title>
          <div className="container">
          <Calendar
            fullscreen={false}
            headerRender={() => <div style={{}}></div>}
            dateFullCellRender={(date) => {
              return <div className="date-cell">{date.date()}</div>;
            }}
            onPanelChange={onPanelChange}
          />
        </div>
          </Col>
          <Col span={12} xl={12} md={24} sm={24} xs={24}>
          <Typography.Title level={3} className="container">{`Next - ${month[value.month()+1]}`}</Typography.Title>
          <div className="container">
          <Calendar
            fullscreen={false}
            value={value.add(1, "M")}
            headerRender={() => <div style={{}}></div>}
            dateFullCellRender={(date) => {
              return <div className="date-cell-next">{date.date()}</div>;
            }}
            onPanelChange={onPanelChange}
          />
        </div>
          </Col>
        </Row>
      </Col>
    </Row>
    </div>
  );
};

export default CalendarComponent;
