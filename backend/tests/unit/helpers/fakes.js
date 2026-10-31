// In-memory fakes that imitate just enough of Mongoose/JWT/bcrypt behaviour for unit tests.
class Query {
  constructor(fn) { this.fn = fn; }
  sort() { return this; }
  lean() { return this; }
  select() { return this; }
  then(res, rej) { return Promise.resolve().then(this.fn).then(res, rej); }
}

function makeTaskModel(store) {
  let n = 0;
  const matches = (t, f) => {
    if (f.userId !== undefined && t.userId !== f.userId) return false;
    if (f._id !== undefined && t._id !== f._id) return false;
    if (f.status !== undefined) {
      if (typeof f.status === "object") throw new Error("operator object reached the database layer");
      if (t.status !== f.status) return false;
    }
    if (f.title && f.title.$regex !== undefined) {
      const re = new RegExp(f.title.$regex, f.title.$options); // throws on invalid pattern, like MongoDB does
      if (!re.test(t.title)) return false;
    }
    return true;
  };
  const wrap = (t) => t && Object.assign(t, { save: async () => t });
  return {
    store,
    find: (f) => new Query(() => store.filter((t) => matches(t, f))),
    findOne: (f) => new Query(() => wrap(store.find((t) => matches(t, f))) || null),
    findOneAndDelete: (f) => new Query(() => {
      const i = store.findIndex((t) => matches(t, f));
      return i === -1 ? null : store.splice(i, 1)[0];
    }),
    create: async (data) => { const t = { _id: `t${++n}`, ...data }; store.push(t); return wrap(t); },
  };
}

function makeUserModel(store) {
  let n = 0;
  const q = (fn) => new Query(fn);
  return {
    store,
    findOne: (f) => q(() => store.find((u) => u.email === f.email) || null),
    findById: (id) => q(() => store.find((u) => u._id === id) || null),
    create: async (d) => { const u = { _id: `u${++n}`, ...d, email: d.email.toLowerCase() /* schema: lowercase:true */, comparePassword: async (pw) => d.passwordHash === "hashed:" + pw }; store.push(u); return u; },
  };
}

const fakeJwt = {
  sign: (payload) => "tok." + Buffer.from(JSON.stringify(payload)).toString("base64url"),
  verify: (t) => {
    if (!t.startsWith("tok.")) throw new Error("invalid token");
    return JSON.parse(Buffer.from(t.slice(4), "base64url"));
  },
};
const fakeBcrypt = { hash: async (pw) => "hashed:" + pw, compare: async (pw, h) => h === "hashed:" + pw };

module.exports = { makeTaskModel, makeUserModel, fakeJwt, fakeBcrypt };
