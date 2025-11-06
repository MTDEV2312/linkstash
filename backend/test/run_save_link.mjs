import { saveLink } from '../src/controllers/linkController.js';
import db from '../src/config/database.js';
import User from '../src/models/User.js';

// Mock req/res
const makeReqRes = () => {
  const body = { url: 'https://www.mathiast.me/', title: '', description: '', tags: [] };
  const req = { body, user: { _id: '000000000000000000000000' } };
  const res = {
    status(code) { this._status = code; return this; },
    json(obj) { console.log('RESP JSON:', JSON.stringify(obj, null, 2)); return obj; }
  };
  return { req, res };
};

(async function run(){
  const { req, res } = makeReqRes();
  // Call saveLink and capture output
  await saveLink(req, res);
})();
