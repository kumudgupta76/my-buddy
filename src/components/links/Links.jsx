import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  Alert, Button, Empty, Form, Input, message, Modal, Popconfirm, Select, Spin, Tag, Tooltip, Typography,
} from 'antd';
import {
  CopyOutlined, DeleteOutlined, EditOutlined, LinkOutlined, PlusOutlined, SearchOutlined,
  ReloadOutlined, StarFilled, StarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { UserContext } from '../../common/UserContext';
import { createLinkId, extractClipboardUrl, normalizeUrl } from './linkModel';
import { deleteLink as deleteSavedLink, loadLinks, saveLink } from './linksStorage';
import './Links.css';

const { Text, Title } = Typography;

const titleFromUrl = (url) => {
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};

const Links = () => {
  const { user } = useContext(UserContext);
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [form] = Form.useForm();

  useEffect(() => {
    let active = true;
    setLinks([]);
    setLoading(true);
    setLoadError(false);
    loadLinks(user.uid).then(result => {
      if (!active) return;
      if (!result.success) {
        message.error('Could not load your saved links.');
        console.error('Could not load links', result.error);
        setLoadError(true);
      } else {
        setLinks(result.links);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [loadAttempt, user.uid]);

  const persistLink = useCallback(async (link) => {
    setSaving(true);
    const result = await saveLink(user.uid, link);
    setSaving(false);
    if (!result.success) {
      message.error('Could not save your changes. Please try again.');
      return;
    }
    setLinks(current => {
      const existing = current.some(item => item.id === link.id);
      return existing
        ? current.map(item => item.id === link.id ? link : item)
        : [link, ...current];
    });
    return true;
  }, [user.uid]);

  const visibleLinks = useMemo(() => {
    const query = search.trim().toLowerCase();
    return links
      .filter(link => filter !== 'favorites' || link.favorite)
      .filter(link => !query || [link.title, link.url, link.notes, ...link.tags]
        .some(value => String(value || '').toLowerCase().includes(query)))
      .sort((a, b) => Number(b.favorite) - Number(a.favorite)
        || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [filter, links, search]);

  const openCreate = () => {
    setEditingLink(null);
    form.resetFields();
    form.setFieldsValue({ url: '', title: '', notes: '', tags: [] });
    setModalVisible(true);
  };

  const openEdit = (link) => {
    setEditingLink(link);
    form.setFieldsValue({
      url: link.url,
      title: link.title,
      notes: link.notes,
      tags: link.tags,
    });
    setModalVisible(true);
  };

  const readClipboard = async () => {
    if (!navigator.clipboard || typeof navigator.clipboard.readText !== 'function') {
      message.error('Clipboard reading is not available here. Paste the link into the URL field instead.');
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const url = extractClipboardUrl(text);
      form.setFieldsValue({ url });
      if (!form.getFieldValue('title')) form.setFieldsValue({ title: titleFromUrl(url) });
      message.success('Link read from clipboard. Review it and save when ready.');
    } catch (error) {
      message.error(error.message || 'Could not read the clipboard. Paste the link into the URL field instead.');
    }
  };

  const submitLink = async (values) => {
    let url;
    try {
      url = normalizeUrl(values.url);
    } catch (error) {
      form.setFields([{ name: 'url', errors: [error.message] }]);
      return;
    }

    const duplicate = links.find(link => link.url.toLowerCase() === url.toLowerCase()
      && link.id !== (editingLink && editingLink.id));
    if (duplicate) {
      message.info(`This link is already saved${duplicate.title ? ` as “${duplicate.title}”` : ''}.`);
      return;
    }

    const now = new Date().toISOString();
    const updated = {
      id: editingLink ? editingLink.id : createLinkId(),
      url,
      title: String(values.title || '').trim() || titleFromUrl(url),
      notes: String(values.notes || '').trim(),
      tags: Array.isArray(values.tags) ? values.tags : [],
      favorite: editingLink ? editingLink.favorite : false,
      createdAt: editingLink ? editingLink.createdAt : now,
      updatedAt: now,
    };
    if (await persistLink(updated)) {
      message.success(editingLink ? 'Link updated.' : 'Link saved.');
      setModalVisible(false);
      form.resetFields();
    }
  };

  const toggleFavorite = async (link) => {
    await persistLink({ ...link, favorite: !link.favorite, updatedAt: new Date().toISOString() });
  };

  const removeLink = async (link) => {
    setSaving(true);
    const result = await deleteSavedLink(user.uid, link.id);
    setSaving(false);
    if (!result.success) {
      message.error('Could not delete this link. Please try again.');
      return;
    }
    setLinks(current => current.filter(item => item.id !== link.id));
    message.success('Link deleted.');
  };

  const copyUrl = async (url) => {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') {
      message.error('Copying is not available in this browser.');
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      message.success('Link copied.');
    } catch (error) {
      console.error('Could not copy link', error);
      message.error('Could not copy the link. Check your browser permissions.');
    }
  };

  return (
    <section className="links-page">
      <div className="links-heading">
        <div>
          <Title level={2}>Saved Links</Title>
          <Text type="secondary">A private place for links you want to keep.</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Add link</Button>
      </div>

      <div className="links-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="Search title, URL, notes, or tags"
          value={search}
          onChange={event => setSearch(event.target.value)}
          aria-label="Search saved links"
        />
        <div className="links-filters" role="group" aria-label="Link filters">
          <Button type={filter === 'all' ? 'primary' : 'default'} onClick={() => setFilter('all')}>All links</Button>
          <Button type={filter === 'favorites' ? 'primary' : 'default'} onClick={() => setFilter('favorites')}>
            <StarFilled /> Favorites
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="links-loading"><Spin size="large" /></div>
      ) : loadError ? (
        <Alert
          type="error"
          showIcon
          message="Your saved links could not be loaded."
          description="Check your connection and try again."
          action={<Button icon={<ReloadOutlined />} onClick={() => setLoadAttempt(attempt => attempt + 1)}>Retry</Button>}
        />
      ) : visibleLinks.length ? (
        <div className="links-list">
          {visibleLinks.map(link => (
            <article className="link-card" key={link.id}>
              <div className="link-card-main">
                <div className="link-card-icon"><LinkOutlined /></div>
                <div className="link-card-content">
                  <a className="link-card-title" href={link.url} target="_blank" rel="noopener noreferrer">
                    {link.title || titleFromUrl(link.url)}
                  </a>
                  <Text className="link-card-url" ellipsis={{ tooltip: link.url }}>{link.url}</Text>
                  {link.notes && <Text className="link-card-notes">{link.notes}</Text>}
                  {!!link.tags.length && (
                    <div className="link-card-tags">{link.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}</div>
                  )}
                  <Text type="secondary" className="link-card-date">
                    Saved {dayjs(link.createdAt).isValid() ? dayjs(link.createdAt).format('D MMM YYYY') : 'recently'}
                  </Text>
                </div>
              </div>
              <div className="link-card-actions">
                <Tooltip title={link.favorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <Button
                    type="text"
                    aria-label={link.favorite ? `Remove ${link.title} from favorites` : `Add ${link.title} to favorites`}
                    icon={link.favorite ? <StarFilled /> : <StarOutlined />}
                    onClick={() => toggleFavorite(link)}
                    disabled={saving}
                  />
                </Tooltip>
                <Tooltip title="Copy URL">
                  <Button type="text" aria-label={`Copy ${link.title} URL`} icon={<CopyOutlined />} onClick={() => copyUrl(link.url)} />
                </Tooltip>
                <Tooltip title="Edit">
                  <Button type="text" aria-label={`Edit ${link.title}`} icon={<EditOutlined />} onClick={() => openEdit(link)} disabled={saving} />
                </Tooltip>
                <Popconfirm
                  title="Delete this saved link?"
                  okText="Delete"
                  okButtonProps={{ danger: true, loading: saving }}
                  onConfirm={() => removeLink(link)}
                >
                  <Tooltip title="Delete">
                    <Button type="text" danger aria-label={`Delete ${link.title}`} icon={<DeleteOutlined />} disabled={saving} />
                  </Tooltip>
                </Popconfirm>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="links-empty">
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={search || filter === 'favorites' ? 'No matching links found.' : 'No saved links yet.'}
          >
            {!search && filter === 'all' && <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>Save your first link</Button>}
          </Empty>
        </div>
      )}

      <Modal
        title={editingLink ? 'Edit link' : 'Save a link'}
        visible={modalVisible}
        onCancel={() => { setModalVisible(false); form.resetFields(); }}
        onOk={() => form.submit()}
        okText={editingLink ? 'Save changes' : 'Save link'}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={submitLink}>
          <Form.Item
            label="URL"
            name="url"
            rules={[{ required: true, message: 'Enter a link URL' }]}
          >
            <Input
              placeholder="https://example.com/article"
              type="url"
              addonAfter={<Button type="link" size="small" onClick={readClipboard}>Read clipboard</Button>}
            />
          </Form.Item>
          <Form.Item label="Title" name="title">
            <Input placeholder="A useful article" maxLength={160} />
          </Form.Item>
          <Form.Item label="Notes" name="notes">
            <Input.TextArea placeholder="Why you saved this link (optional)" rows={3} maxLength={1000} />
          </Form.Item>
          <Form.Item label="Tags" name="tags">
            <Select mode="tags" tokenSeparators={[',']} placeholder="Add tags (optional)" />
          </Form.Item>
        </Form>
      </Modal>
    </section>
  );
};

export default Links;
