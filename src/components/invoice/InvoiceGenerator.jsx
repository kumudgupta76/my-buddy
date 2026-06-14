import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, Button, Table, Row, Col, Card, message, Space, Typography, Radio } from 'antd';
import { PlusOutlined, DeleteOutlined, PrinterOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import './InvoiceGenerator.css';

const { Title } = Typography;

const STORAGE_KEY = 'invoice-generator-state';

const blankItem = () => ({
  key: Date.now().toString() + Math.random().toString(36).slice(2, 6),
  name: '',
  pack: '',
  hsn: '',
  batch: '',
  exp: '',
  qty: '',
  mrp: '',
  rate: '',
  price: '',
  sgst: '',
  cgst: '',
});

const defaultHeader = {
  storeName: 'GOPI KRISHNA MEDICAL STORE',
  addressLine1: 'GENERAL GANJ ARYA SAMAJ ROAD',
  addressLine2: 'MATHURA',
  phone: '7251066066',
  email: 'gopikrishnahospital@gmail.com',
  gstin: '09AATHP2278N1Z5',
  dlNo: 'UP85200001230-210001229',
  patientName: '',
  patientAddress: '',
  drName: '',
  drRegNo: '',
  invoiceNo: '',
  date: dayjs().format('DD-MM-YYYY'),
  time: dayjs().format('HH:mm'),
};

const defaultHeaderDental = {
  clinicName: '',
  patientName: '',
  patientInfo: '',
  invoiceNo: '',
  date: dayjs().format('DD/MM/YYYY'),
  bankName: 'sbi',
  accountNo: '',
  doctorName: 'Dr. Saurabh Gupta',
  doctorQual: 'B.D.S, MIDA',
  doctorRegNo: '',
  doctorAddress: '24, Khatri Dharmshala, General Ganj, Mathura',
  doctorMob: '',
};

// ---- amount in words (Indian numbering) ----
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const twoDigits = (n) => {
  if (n < 20) return ones[n];
  return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
};

const threeDigits = (n) => {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  let str = '';
  if (h) str += ones[h] + ' Hundred';
  if (rest) str += (h ? ' ' : '') + twoDigits(rest);
  return str;
};

const numberToWords = (num) => {
  num = Math.floor(Number(num) || 0);
  if (num === 0) return 'Zero';
  let words = '';
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;
  if (crore) words += threeDigits(crore) + ' Crore ';
  if (lakh) words += twoDigits(lakh) + ' Lakh ';
  if (thousand) words += twoDigits(thousand) + ' Thousand ';
  if (hundred) words += threeDigits(hundred);
  return words.trim();
};

const InvoiceGenerator = () => {
  const [template, setTemplate] = useState('medical');
  const [header, setHeader] = useState(defaultHeader);
  const [dentalHeader, setDentalHeader] = useState(defaultHeaderDental);
  const [items, setItems] = useState([blankItem()]);
  const printRef = useRef(null);

  // load saved state
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved) {
        if (saved.template) setTemplate(saved.template);
        if (saved.header) setHeader((h) => ({ ...h, ...saved.header }));
        if (saved.dentalHeader) setDentalHeader((h) => ({ ...h, ...saved.dentalHeader }));
        if (Array.isArray(saved.items) && saved.items.length) setItems(saved.items);
      }
    } catch (e) {
      /* ignore */
    }
  }, []);

  // persist state
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ template, header, dentalHeader, items }));
  }, [template, header, dentalHeader, items]);

  const updateHeader = (field, value) => setHeader((h) => ({ ...h, [field]: value }));
  const updateDentalHeader = (field, value) => setDentalHeader((h) => ({ ...h, [field]: value }));

  const updateItem = (key, field, value) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, [field]: value } : it)));

  const addItem = () => setItems((list) => [...list, blankItem()]);

  const removeItem = (key) =>
    setItems((list) => (list.length > 1 ? list.filter((it) => it.key !== key) : list));

  const lineAmount = (it) => (Number(it.qty) || 0) * (Number(it.rate) || 0);

  // dental subtotal: qty * price, or just price when qty is blank
  const subtotal = (it) => {
    const q = Number(it.qty) || 0;
    const p = Number(it.price) || 0;
    return q ? q * p : p;
  };

  const grandTotal = items.reduce((sum, it) => sum + lineAmount(it), 0);
  const dentalTotal = items.reduce((sum, it) => sum + subtotal(it), 0);

  const resetAll = () => {
    setItems([blankItem()]);
    setHeader({ ...defaultHeader, date: dayjs().format('DD-MM-YYYY'), time: dayjs().format('HH:mm') });
    setDentalHeader({ ...defaultHeaderDental, date: dayjs().format('DD/MM/YYYY') });
    message.success('Invoice cleared');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    if (!printRef.current) return;
    const hide = message.loading('Generating PDF...', 0);
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const orientation = template === 'dental' ? 'portrait' : 'landscape';
      const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      const finalHeight = Math.min(imgHeight, pageHeight - margin * 2);
      const finalWidth = finalHeight < imgHeight ? (canvas.width * finalHeight) / canvas.height : usableWidth;
      pdf.addImage(imgData, 'PNG', margin, margin, finalWidth, finalHeight);
      const invNo = template === 'dental' ? dentalHeader.invoiceNo : header.invoiceNo;
      const invDate = template === 'dental' ? dentalHeader.date : header.date;
      const fileName = `Invoice_${invNo || invDate || 'new'}.pdf`;
      pdf.save(fileName);
      message.success('PDF downloaded');
    } catch (e) {
      message.error('Could not generate PDF');
    } finally {
      hide();
    }
  };

  // ---- editable input table columns ----
  const cell = (field, placeholder, width) => ({
    title: placeholder,
    dataIndex: field,
    width,
    render: (_, record) => (
      <Input
        size="small"
        value={record[field]}
        placeholder={placeholder}
        onChange={(e) => updateItem(record.key, field, e.target.value)}
      />
    ),
  });

  const columns = [
    { title: 'SN', render: (_, __, i) => i + 1, width: 40 },
    cell('name', 'Product Name', 200),
    cell('pack', 'Pack', 70),
    cell('hsn', 'HSN', 60),
    cell('batch', 'Batch', 100),
    cell('exp', 'Exp', 60),
    cell('qty', 'Qty', 60),
    cell('mrp', 'MRP', 70),
    cell('rate', 'Rate', 70),
    cell('sgst', 'SGST%', 60),
    cell('cgst', 'CGST%', 60),
    {
      title: 'Amount',
      width: 80,
      render: (_, record) => lineAmount(record).toFixed(2),
    },
    {
      title: '',
      width: 40,
      render: (_, record) => (
        <Button
          size="small"
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ];

  const deleteCol = {
    title: '',
    width: 40,
    render: (_, record) => (
      <Button
        size="small"
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={() => removeItem(record.key)}
      />
    ),
  };

  const dentalColumns = [
    { title: 'NO', render: (_, __, i) => i + 1, width: 40 },
    cell('name', 'Description', 280),
    cell('qty', 'Qty', 70),
    cell('price', 'Price', 90),
    {
      title: 'Subtotal',
      width: 90,
      render: (_, record) => subtotal(record).toFixed(2),
    },
    deleteCol,
  ];

  const headerField = (label, field, span = 8) => (
    <Col xs={24} sm={12} md={span}>
      <Form.Item label={label} style={{ marginBottom: 8 }}>
        <Input value={header[field]} onChange={(e) => updateHeader(field, e.target.value)} />
      </Form.Item>
    </Col>
  );

  const dentalField = (label, field, span = 8) => (
    <Col xs={24} sm={12} md={span}>
      <Form.Item label={label} style={{ marginBottom: 8 }}>
        <Input value={dentalHeader[field]} onChange={(e) => updateDentalHeader(field, e.target.value)} />
      </Form.Item>
    </Col>
  );

  const isDental = template === 'dental';

  return (
    <div className="invoice-generator">
      {/* ---------- INPUT SECTION (hidden when printing) ---------- */}
      <div className="invoice-editor no-print">
        <Card size="small" style={{ marginBottom: 16 }}>
          <Radio.Group
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          >
            <Radio.Button value="medical">Medical (GST)</Radio.Button>
            <Radio.Button value="dental">Dental / Simple</Radio.Button>
          </Radio.Group>
        </Card>

        <Card size="small" title="Invoice Details" style={{ marginBottom: 16 }}>
          {!isDental ? (
            <Form layout="vertical">
              <Title level={5} style={{ marginTop: 0 }}>Store</Title>
              <Row gutter={12}>
                {headerField('Store Name', 'storeName')}
                {headerField('Address Line 1', 'addressLine1')}
                {headerField('Address Line 2', 'addressLine2')}
                {headerField('Phone', 'phone')}
                {headerField('Email', 'email')}
                {headerField('GSTIN', 'gstin')}
                {headerField('D.L. No.', 'dlNo', 16)}
              </Row>

              <Title level={5}>Patient / Doctor</Title>
              <Row gutter={12}>
                {headerField('Patient Name', 'patientName')}
                {headerField('Patient Address', 'patientAddress')}
                {headerField('Dr Name', 'drName')}
                {headerField('Dr Reg No.', 'drRegNo')}
                {headerField('Invoice No.', 'invoiceNo')}
                {headerField('Date', 'date')}
                {headerField('Time', 'time')}
              </Row>
            </Form>
          ) : (
            <Form layout="vertical">
              <Title level={5} style={{ marginTop: 0 }}>Invoice</Title>
              <Row gutter={12}>
                {dentalField('Clinic Name (optional)', 'clinicName', 16)}
                {dentalField('Invoice No.', 'invoiceNo')}
                {dentalField('Date Issued', 'date')}
                {dentalField('Issued To (Name)', 'patientName')}
                {dentalField('Patient Info (e.g. age-40Y f)', 'patientInfo')}
              </Row>

              <Title level={5}>Bank / Doctor</Title>
              <Row gutter={12}>
                {dentalField('Bank Name', 'bankName')}
                {dentalField('Account No.', 'accountNo')}
                {dentalField('Doctor Name', 'doctorName')}
                {dentalField('Qualification', 'doctorQual')}
                {dentalField('Reg No.', 'doctorRegNo')}
                {dentalField('Address', 'doctorAddress', 16)}
                {dentalField('Mobile', 'doctorMob')}
              </Row>
            </Form>
          )}
        </Card>

        <Card
          size="small"
          title="Products"
          style={{ marginBottom: 16 }}
          extra={
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={addItem}>
              Add Row
            </Button>
          }
        >
          <Table
            columns={isDental ? dentalColumns : columns}
            dataSource={items}
            pagination={false}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        </Card>

        <Space style={{ marginBottom: 24 }}>
          <Button type="primary" icon={<DownloadOutlined />} onClick={handleDownload}>
            Download PDF
          </Button>
          <Button icon={<PrinterOutlined />} onClick={handlePrint}>
            Print
          </Button>
          <Button icon={<ReloadOutlined />} onClick={resetAll}>
            Clear
          </Button>
        </Space>
      </div>

      {/* ---------- PRINTABLE INVOICE ---------- */}
      <div className={`invoice-print ${isDental ? 'invoice-print-dental' : ''}`} ref={printRef}>
        {!isDental ? (
          <>
            <div className="inv-top">
          <div className="inv-store">
            <div className="inv-store-name">{header.storeName}</div>
            <div>{header.addressLine1}</div>
            <div>{header.addressLine2}</div>
            {header.phone && <div>Phone : {header.phone}</div>}
            {header.email && <div>E-Mail : {header.email}</div>}
          </div>
          <div className="inv-patient">
            <div><span className="inv-lbl">Patient Name :</span> {header.patientName}</div>
            <div><span className="inv-lbl">Patient Address :</span> {header.patientAddress}</div>
            <div><span className="inv-lbl">Dr Name :</span> {header.drName}</div>
          </div>
        </div>

        <div className="inv-meta">
          <div className="inv-meta-left">
            <div>GSTIN : {header.gstin}</div>
            <div>D.L.No. : {header.dlNo}</div>
          </div>
          <div className="inv-title">GST INVOICE CASH</div>
          <div className="inv-meta-right">
            <div>Invoice No. {header.invoiceNo} &nbsp; Date: {header.date}</div>
            <div>TIME : {header.time}</div>
          </div>
        </div>

        <table className="inv-table">
          <thead>
            <tr>
              <th>SN.</th>
              <th className="ta-left">PRODUCT NAME</th>
              <th>PACK</th>
              <th>HSN</th>
              <th>BATCH</th>
              <th>EXP.</th>
              <th>QTY</th>
              <th>MRP</th>
              <th>RATE</th>
              <th>SGST</th>
              <th>CGST</th>
              <th>AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={it.key}>
                <td>{i + 1}.</td>
                <td className="ta-left">{it.name}</td>
                <td>{it.pack}</td>
                <td>{it.hsn}</td>
                <td>{it.batch}</td>
                <td>{it.exp}</td>
                <td>{it.qty}</td>
                <td className="ta-right">{it.mrp}</td>
                <td className="ta-right">{Number(it.rate) ? Number(it.rate).toFixed(2) : it.rate}</td>
                <td>{it.sgst}</td>
                <td>{it.cgst}</td>
                <td className="ta-right">{lineAmount(it) ? lineAmount(it).toFixed(2) : ''}</td>
              </tr>
            ))}
            {/* filler rows for layout */}
            {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
              <tr key={`filler-${i}`} className="inv-filler">
                <td colSpan={12}>&nbsp;</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="inv-bottom">
          <div className="inv-terms">
            <div className="inv-terms-title">Terms &amp; Conditions</div>
            <div>Items once sold will be taken back or exchanged in 7 days.</div>
            <div>Medicine Return Time 2:00PM TO 5:00PM</div>
            <div>All disputes subject to Jurisdication only.</div>
            <div>Prescribed Sales Tax declaration will be given.</div>
            <div className="inv-remark">Remark :</div>
          </div>
          <div className="inv-sign">
            <div className="inv-sign-for">For {header.storeName}</div>
            <div className="inv-sign-line">Authorised Signatory</div>
          </div>
        </div>

        <div className="inv-total-row">
          <div className="inv-words">Rs. {numberToWords(grandTotal)} only</div>
          <div className="inv-grand">
            <span>GRAND TOTAL</span>
            <span className="inv-grand-amt">{grandTotal.toFixed(2)}</span>
          </div>
        </div>

        <div className="inv-footer-note">
          Get well soon. Scan the Healthcare QR Code for complete health services, insurance, and government benefits.
        </div>
          </>
        ) : (
          <>
            {dentalHeader.clinicName && (
              <div className="dent-clinic">{dentalHeader.clinicName}</div>
            )}
            <div className="dent-title">INVOICE</div>

            <div className="dent-meta">
              <div className="dent-meta-left">
                <div className="dent-lbl">Date Issued:</div>
                <div>{dentalHeader.date}</div>
                <div className="dent-lbl">Invoice No:</div>
                <div>{dentalHeader.invoiceNo}</div>
              </div>
              <div className="dent-meta-right">
                <div className="dent-lbl">Issued to:</div>
                <div>{dentalHeader.patientName}</div>
                <div>Age:{dentalHeader.patientInfo}</div>
              </div>
            </div>

            <table className="dent-table">
              <thead>
                <tr>
                  <th className="dent-no">NO</th>
                  <th className="ta-left">DESCRIPTION</th>
                  <th>QTY</th>
                  <th>PRICE</th>
                  <th>SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={it.key}>
                    <td>{i + 1}</td>
                    <td className="ta-left">{it.name}</td>
                    <td>{it.qty}</td>
                    <td>{it.price}</td>
                    <td>{subtotal(it) ? subtotal(it).toFixed(0) : ''}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                  <tr key={`dfiller-${i}`} className="dent-filler">
                    <td>&nbsp;</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                ))}
                <tr className="dent-total-row">
                  <td colSpan={3}></td>
                  <td className="dent-total-lbl">GRAND TOTAL</td>
                  <td className="dent-total-amt">{dentalTotal.toFixed(0)}/-</td>
                </tr>
              </tbody>
            </table>

            <div className="dent-bottom">
              <div className="dent-note">
                <div className="dent-note-title">Note:</div>
                <div>Bank Name: {dentalHeader.bankName}</div>
                <div>Account No: {dentalHeader.accountNo}</div>
              </div>
              <div className="dent-doctor">
                <div className="dent-doctor-name">{dentalHeader.doctorName}</div>
                {dentalHeader.doctorQual && <div>{dentalHeader.doctorQual}</div>}
                {dentalHeader.doctorRegNo && <div>Reg. No: {dentalHeader.doctorRegNo}</div>}
                {dentalHeader.doctorAddress && <div>{dentalHeader.doctorAddress}</div>}
                {dentalHeader.doctorMob && <div>Mob: {dentalHeader.doctorMob}</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default InvoiceGenerator;
