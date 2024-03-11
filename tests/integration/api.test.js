const supertest = require('supertest');
const server = require('../../server');
const {CabinetBox, Patient, Caretaker, Cabinet, Schedule, Session} = require("../../database");
const request = supertest(server);

beforeAll( async () => {
    const test_caretaker = await Caretaker.create({
        id: "test_caretaker",
        first_name: "test",
        last_name: "test",
        email: "test",
        password: "test",
        admin: false
    });
    const test_cabinet = await Cabinet.create({
        id: "test_cabinet",
        name: "test",
        key: "test"
    });
    const test_patient = await Patient.create({
        id: "test_patient",
        first_name: "test",
        last_name: "test",
        email: "test",
        dob: Date.now(),
        caretaker_id: test_caretaker.id,
        cabinet_id: test_cabinet.id
    });
});

afterAll( async () => {
    await Patient.destroy({ where: { id: "test_patient"}});
    await Cabinet.destroy({ where: { id: "test_cabinet"}});
    await Caretaker.destroy({ where: { id: "test_caretaker"}});
});

describe('GET /test', () => {
    it('gets the test endpoint', async () => {
        const res = await request.get('/test');
        expect(res.status).toBe(200)
        expect(res.body.message).toBe('pass!')
        // ...
    });
});

describe('GET /api/search_medications/:searchQuery', () => {
    it('should return a list of medications based on the search query', async () => {
        const res = await request.get('/api/search_medications/0573-1769');
        const expectedResponse = [
            {
                "id": "10d00641-1cd5-4c9f-b3b3-3c072013f6ff",
                "brand_name": "Advil",
                "generic_name": "IBUPROFEN",
                "manufacturer_name": "Haleon US Holdings LLC",
                "route": "ORAL",
                "product_ndc": [
                    "0573-0149",
                    "0573-0169",
                    "0573-1769"
                ]
            }
        ];

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(expectedResponse);
    });
});

describe('GET /api/search_medications/:searchQuery', () => {
    it('should return an empty array', async () => {
        const res = await request.get('/api/search_medications/aaaaaaaa');
        const expectedResponse = [];

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(expectedResponse);
    });
});

describe('GET /api/search_medications/:searchQuery', () => {
    it('should return an empty object', async () => {
        const res = await request.get('/api/search_medications/');
        const expectedResponse = {};

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(expectedResponse);
    });
});

describe('GET /api/get_medication/:id', () => {
    it('should return a medication based on the id', async () => {
        const res = await request.get('/api/get_medication/f70a8d20-570c-1e94-e053-6294a90ab66f');
        const expectedResponse = {
            "id": "f70a8d20-570c-1e94-e053-6294a90ab66f",
            "brand_name": "Advil",
            "generic_name": "IBUPROFEN",
            "manufacturer_name": "Navajo Manufacturing Company Inc.",
            "route": "ORAL",
            "product_ndc": [
                "67751-146"
            ]
        };

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(expectedResponse);
    });
});

describe('GET /api/get_medication/:id', () => {
    it('should return no medication', async () => {
        const res = await request.get('/api/get_medication/a');
        const expectedResponse = {"code": "ERR_BAD_REQUEST", "message": "No medication found"};

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(expectedResponse);
    });
});

describe('GET /api/get_medication/:id', () => {
    it('should return an empty object', async () => {
        const res = await request.get('/api/get_medication/');
        const expectedResponse = {};

        expect(res.statusCode).toBe(404);
        expect(res.body).toEqual(expectedResponse);
    });
});

describe('POST /api/medication', () => {
    it('should acknowledge the medications list update', async () => {
        const res = await request.post('/api/medication').send({
            "patient_id": "test_patient",
            "cabinet_id": "test_cabinet",
            "medications": [
                {
                    "medication_id": "f70a8d20-570c-1e94-e053-6294a90ab66f",
                    "box": 0,
                    "quantity": 100
                },
                {
                    "medication_id": "f70a8d20-570c-1e94-e053-6294a90ab66f",
                    "box": 1,
                    "quantity": 2
                },
                {
                    "medication_id": "12c38d55-27d3-4060-8563-42aafa17d586",
                    "box": 7,
                    "quantity": 88
                }
            ]
        });

        const expectedResponse = { message: 'Medication received successfully.' };
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(expectedResponse);

        const medicationsInDb = await CabinetBox.findAll({
            where: {cabinet_id: "test_cabinet"}
        });

        expect(medicationsInDb.length).toBeGreaterThan(0);
    });

    afterEach(async () => {
        await CabinetBox.destroy({ where: { cabinet_id: "test_cabinet" } });
    });
});

describe('POST /api/medication', () => {
    it('should return bad request', async () => {
        const res = await request.post('/api/medication').send({
            "aaaa": "aaaa"
        });

        const expectedResponse = { message: 'Bad Request' };
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(expectedResponse);
    });
});

describe('POST /api/schedule', () => {
    it('should acknowledge the schedule update', async () => {
        const res = await request.post('/api/schedule').send({
            "patient_id": "test_patient",
            "cabinet_id": "test_cabinet",
            "medications": [
                {
                    "medication_id": "f70a8d20-570c-1e94-e053-6294a90ab66f",
                    "day": 1,
                    "time": "11:30"
                },
                {
                    "medication_id": "f70a8d20-570c-1e94-e053-6294a90ab66f",
                    "day": 1,
                    "time": "16:30"
                },
                {
                    "medication_id": "12c38d55-27d3-4060-8563-42aafa17d586",
                    "day": 4,
                    "time": "11:30"
                }
            ]
        });

        const expectedResponse = { message: 'Schedule received successfully.' };
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(expectedResponse);
    });

    afterEach(async () => {
        await Schedule.destroy({ where: { patient_id: "test_patient" } });
    });
});

describe('POST /api/schedule', () => {
    it('should return bad request', async () => {
        const res = await request.post('/api/schedule').send({
            "aaaa": "aaaa"
        });

        const expectedResponse = { message: 'Bad Request' };
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(expectedResponse);
    });
});

describe('POST /api/session', () => {
    it('should acknowledge the session update', async () => {
        const res = await request.post('/api/session').send({
            "patient_id": "test_patient",
            "cabinet_id": "test_cabinet",
            "alarm_time": "2023-05-24 05:45:00",
            "start_time": "2023-05-24 05:50:00",
            "end_time": "2023-05-24 05:50:50",
            "session_intakes": [
                {
                    "medication_id": "f70a8d20-570c-1e94-e053-6294a90ab66f",
                    "start_time": "2023-05-24 05:50:00",
                    "end_time": "2023-05-24 05:50:10",
                    "ingested": true
                },
                {
                    "medication_id": "12c38d55-27d3-4060-8563-42aafa17d586",
                    "start_time": "2023-05-24 05:50:10",
                    "end_time": "2023-05-24 05:50:20",
                    "ingested": true
                }
            ]
        });

        const expectedResponse = { message: 'Session received successfully.' };
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual(expectedResponse);
    });

    afterEach(async () => {
        await Session.destroy({ where: { patient_id: "test_patient" } });
    });
});

describe('POST /api/session', () => {
    it('should return bad request', async () => {
        const res = await request.post('/api/session').send({
            "aaaa": "aaaa"
        });

        const expectedResponse = { message: 'Bad Request' };
        expect(res.statusCode).toBe(400);
        expect(res.body).toEqual(expectedResponse);
    });
});
