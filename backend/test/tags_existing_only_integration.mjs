#!/usr/bin/env node

import 'dotenv/config';
import axios from 'axios';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  validateStatus: () => true
});

const randomId = () => Math.random().toString(36).slice(2, 9);

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`ASSERT_FAIL: ${message}`);
  }
  console.log(`OK: ${message}`);
};

const authHeaders = (token) => ({ Authorization: `Bearer ${token}` });

async function registerUser() {
  const id = randomId();
  const payload = {
    email: `tags-e2e-${id}@test.com`,
    username: `tagse2e${id}`,
    password: 'Test@123456'
  };

  const res = await api.post('/api/auth/register', payload);
  assert(res.status === 201, `register status 201 (got ${res.status})`);

  const token = res.data?.data?.token;
  assert(Boolean(token), 'register returns token');

  return token;
}

async function createTag(token, name) {
  const res = await api.post(
    '/api/tags',
    { name, color: '#3B82F6', description: 'tag para e2e' },
    { headers: authHeaders(token) }
  );

  assert([200, 201].includes(res.status), `createTag status 200/201 (got ${res.status})`);
  const tagName = res.data?.data?.tag?.name;
  assert(tagName === name, `tag creado con nombre esperado (${name})`);
}

async function run() {
  const health = await api.get('/health');
  assert(health.status === 200, `health status 200 (got ${health.status})`);

  const token = await registerUser();
  const allowedTag = `permitida-${randomId()}`;
  const blockedTag = `bloqueada-${randomId()}`;
  const blockedTag2 = `bloqueada2-${randomId()}`;

  await createTag(token, allowedTag);

  const paginatedTagPrefix = `pagina-${randomId()}`;
  const paginatedTagNames = [];
  for (let index = 0; index < 6; index += 1) {
    const tagName = `${paginatedTagPrefix}-${index}`;
    paginatedTagNames.push(tagName);
    await createTag(token, tagName);
  }

  const saveRes = await api.post(
    '/api/links/save-link',
    {
      url: `https://example.com/${randomId()}`,
      title: `Test tags ${randomId()}`,
      description: 'test tags existentes',
      tags: [allowedTag, blockedTag]
    },
    { headers: authHeaders(token) }
  );

  assert([201, 202].includes(saveRes.status), `save-link status 201/202 (got ${saveRes.status})`);

  const link = saveRes.data?.data?.link;
  assert(Boolean(link?._id), 'save-link devuelve _id');
  assert(Array.isArray(link?.tags), 'save-link devuelve tags array');
  assert(link.tags.includes(allowedTag), 'save-link conserva tag existente');
  assert(!link.tags.includes(blockedTag), 'save-link ignora tag inexistente');

  for (let index = 0; index < 5; index += 1) {
    const extraRes = await api.post(
      '/api/links/save-link',
      {
        url: `https://example.com/${randomId()}-${index}`,
        title: `Extra ${index} ${randomId()}`,
        description: 'extra links para paginacion',
        tags: [allowedTag]
      },
      { headers: authHeaders(token) }
    );

    assert([201, 202].includes(extraRes.status), `extra save-link ${index + 1} status 201/202 (got ${extraRes.status})`);
  }

  const filteredListRes = await api.get('/api/links', {
    headers: authHeaders(token),
    params: {
      search: '',
      tags: [allowedTag],
      archived: 'false',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      page: '1',
      limit: '5'
    }
  });

  assert(filteredListRes.status === 200, `get links with array tags status 200 (got ${filteredListRes.status})`);
  const filteredLinks = filteredListRes.data?.data?.links || [];
  assert(filteredLinks.length <= 5, 'get links no devuelve más de 5 items por página');
  assert(filteredLinks.some((item) => Array.isArray(item.tags) && item.tags.includes(allowedTag)), 'get links filtra correctamente con tags en formato array');
  assert((filteredListRes.data?.data?.pagination?.totalPages || 0) >= 2, 'get links calcula paginación con múltiples páginas');

  const tagsResAfterSave = await api.get('/api/tags', { headers: authHeaders(token) });
  assert(tagsResAfterSave.status === 200, `get tags status 200 (got ${tagsResAfterSave.status})`);
  const allTagsAfterSave = tagsResAfterSave.data?.data?.tags || [];
  assert(!allTagsAfterSave.some((tag) => tag.name === blockedTag), 'save-link no crea etiqueta inexistente');

  const paginatedTagsPage1 = await api.get('/api/tags', {
    headers: authHeaders(token),
    params: {
      search: paginatedTagPrefix,
      page: 1,
      limit: 5
    }
  });

  assert(paginatedTagsPage1.status === 200, `paginated tags page 1 status 200 (got ${paginatedTagsPage1.status})`);
  const page1Tags = paginatedTagsPage1.data?.data?.tags || [];
  assert(page1Tags.length <= 5, 'tags page 1 no devuelve más de 5 elementos');
  assert((paginatedTagsPage1.data?.data?.pagination?.totalPages || 0) >= 2, 'tags page 1 calcula múltiples páginas');

  const paginatedTagsPage2 = await api.get('/api/tags', {
    headers: authHeaders(token),
    params: {
      search: paginatedTagPrefix,
      page: 2,
      limit: 5
    }
  });

  assert(paginatedTagsPage2.status === 200, `paginated tags page 2 status 200 (got ${paginatedTagsPage2.status})`);
  const page2Tags = paginatedTagsPage2.data?.data?.tags || [];
  assert(page2Tags.length >= 1, 'tags page 2 devuelve los elementos restantes');

  const allTagsMode = await api.get('/api/tags', {
    headers: authHeaders(token),
    params: {
      all: true
    }
  });

  assert(allTagsMode.status === 200, `all tags mode status 200 (got ${allTagsMode.status})`);
  const allModeTags = allTagsMode.data?.data?.tags || [];
  assert(allModeTags.length >= paginatedTagNames.length, 'modo all sigue devolviendo la lista completa para selectores');

  const updateRes = await api.put(
    `/api/links/${link._id}`,
    { tags: [allowedTag, blockedTag2] },
    { headers: authHeaders(token) }
  );

  assert(updateRes.status === 200, `update-link status 200 (got ${updateRes.status})`);
  const updatedLink = updateRes.data?.data?.link;
  assert(Array.isArray(updatedLink?.tags), 'update-link devuelve tags array');
  assert(updatedLink.tags.includes(allowedTag), 'update-link mantiene tags existentes');
  assert(!updatedLink.tags.includes(blockedTag2), 'update-link ignora tags inexistentes');

  // Garantiza que la etiqueta permitida exista para la prueba de batch.
  await createTag(token, allowedTag);

  const batchBlockedRes = await api.post(
    '/api/links/batch',
    {
      action: 'addTag',
      linkIds: [link._id],
      tag: blockedTag
    },
    { headers: authHeaders(token) }
  );

  assert(batchBlockedRes.status === 400, `batch addTag inexistente status 400 (got ${batchBlockedRes.status})`);

  const batchAllowedRes = await api.post(
    '/api/links/batch',
    {
      action: 'addTag',
      linkIds: [link._id],
      tag: allowedTag
    },
    { headers: authHeaders(token) }
  );

  assert(batchAllowedRes.status === 200, `batch addTag existente status 200 (got ${batchAllowedRes.status})`);

  console.log('E2E_RESULT=PASS');
}

run().catch((error) => {
  console.error('E2E_RESULT=FAIL');
  console.error(error.message || error);
  process.exit(1);
});
