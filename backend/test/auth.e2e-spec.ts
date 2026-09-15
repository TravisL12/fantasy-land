import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

// Requires Postgres (`docker compose up db`); set DATABASE_URL if not on localhost:5432.
describe('Auth (e2e)', () => {
  let app: INestApplication;
  const suffix = Date.now().toString(36);
  const account = {
    email: `Coach_${suffix}@Example.com`,
    username: `coach_${suffix}`,
    password: 'touchdown123',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers, reads the session, logs out, and logs back in', async () => {
    const agent = request.agent(app.getHttpServer());

    const registered = await agent
      .post('/api/auth/register')
      .send(account)
      .expect(201);
    expect(registered.body.user).toMatchObject({
      email: account.email.toLowerCase(),
      username: account.username,
    });
    expect(registered.body.user.passwordHash).toBeUndefined();
    expect(registered.headers['set-cookie'][0]).toMatch(/session=.+HttpOnly/);

    const me = await agent.get('/api/auth/me').expect(200);
    expect(me.body.user.username).toBe(account.username);

    await agent.post('/api/auth/logout').expect(204);
    const loggedOut = await agent.get('/api/auth/me').expect(200);
    expect(loggedOut.body.user).toBeNull();

    await agent
      .post('/api/auth/login')
      .send({ email: account.email, password: account.password })
      .expect(200);
    const back = await agent.get('/api/auth/me').expect(200);
    expect(back.body.user.username).toBe(account.username);
  });

  it('rejects a wrong password and duplicate accounts', async () => {
    const server = app.getHttpServer();

    await request(server)
      .post('/api/auth/login')
      .send({ email: account.email, password: 'wrong-password' })
      .expect(401);
    await request(server)
      .post('/api/auth/register')
      .send({ ...account, email: `other_${suffix}@example.com`, username: account.username.toUpperCase() })
      .expect(409);
  });

  it('rejects invalid registration input', () =>
    request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'not-an-email', username: 'a!', password: 'short' })
      .expect(400));
});
