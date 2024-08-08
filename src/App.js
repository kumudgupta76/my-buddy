import './App.css';
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import CountdownTimer from './components/timer/CountdownTimer';
import Timer from './components/Timer';
import Layout from './components/Layout';
import NoPage from './components/NoPage';
import ExpenseTracker from './components/expense/ExpenseTracker';
import CalendarComponent from './components/Calander';
import Home from './components/Home';
import Todo from './components/todo/Todo';
import Battery from './components/battery/Battery';
import CalendarView from './components/calander/CalanderView';
import LocalStorageManager from './components/admin/LocalStorgeManager';

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="my-buddy/" element={<Home />} />
          <Route path="my-buddy/todo" element={<Todo />} />
          <Route path="my-buddy/timer" element={<CountdownTimer />} />
          <Route path="my-buddy/contact" element={<Timer />} />
          <Route path="my-buddy/cal" element={<CalendarComponent />} />
          <Route path="my-buddy/calview" element={<CalendarView></CalendarView>} />
          <Route path="my-buddy/battery" element={<Battery />} />
          <Route path="my-buddy/admin" element={<LocalStorageManager />} />
          <Route path="*" element={<NoPage />} />
          <Route path="my-buddy/expense" element={<ExpenseTracker />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;
