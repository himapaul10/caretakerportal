const { Sequelize } = require("sequelize");
require("./constants");

const sequelize = new Sequelize({
    dialect: 'mysql',
    host: 'caretaker-portal.c5888ae8yqbj.us-east-1.rds.amazonaws.com',
    username: 'admin',
    password: 'AnikaAWS123',
    database: 'careportal',
    logging: false
});

console.log("Initializing Models...");

const initPatient = require('./models/Patient');
const initCaretaker = require('./models/Caretaker');
const initCabinet = require('./models/Cabinet');
const initCabinetBox = require('./models/CabinetBox');
const initMedication = require('./models/Medication');
const initNDC = require('./models/NDC');
const initSession = require("./models/Session");
const initSessionIntake = require("./models/SessionIntake");
const initSchedule = require("./models/Schedule");

const Caretaker = initCaretaker(sequelize);
const Patient = initPatient(sequelize);
const Cabinet = initCabinet(sequelize);
const CabinetBox = initCabinetBox(sequelize);
const Medication = initMedication(sequelize);
const NDC = initNDC(sequelize);
const Session = initSession(sequelize);
const SessionIntake = initSessionIntake(sequelize);
const Schedule = initSchedule(sequelize);


Caretaker.hasMany(Patient, {
    foreignKey: "caretaker_id"
});
Patient.belongsTo(Caretaker, {
    foreignKey: "caretaker_id"
})

Cabinet.hasMany(Patient, {
    foreignKey: "cabinet_id"
});
Patient.belongsTo(Cabinet, {
    foreignKey: "cabinet_id"
});

Medication.hasMany(NDC, {
    foreignKey: "medication_id"
});
Medication.hasMany(Schedule, {
    foreignKey: 'medication_id',
});
Schedule.belongsTo(Medication, {
    foreignKey: 'medication_id',
});
Schedule.hasMany(SessionIntake, {
    foreignKey: 'medication_id',
});
SessionIntake.belongsTo(Schedule, {
    foreignKey: 'medication_id',
});


NDC.belongsTo(Medication, {
    foreignKey: "medication_id"
});

Patient.hasMany(Session, {
    foreignKey: "patient_id"
});
Session.belongsTo(Patient, {
    foreignKey: "patient_id"
});

Session.hasMany(SessionIntake, {
    foreignKey: "session_id"
});
SessionIntake.belongsTo(Session, {
    foreignKey: "session_id"
});

Medication.hasMany(SessionIntake, {
    foreignKey: "medication_id"
});

Patient.hasMany(Schedule, {
    foreignKey: "patient_id"
});
Schedule.belongsTo(Patient, {
    foreignKey: "patient_id"
});

Medication.hasMany(Schedule, {
    foreignKey: "medication_id"
});

Medication.hasMany(CabinetBox, {
    foreignKey: "medication_id"
})

CabinetBox.belongsTo(Cabinet, {
    foreignKey: "cabinet_id"
})

Cabinet.hasMany(CabinetBox, {
    foreignKey: "cabinet_id",
})


sequelize.sync({ force: false }).then(() => {
    console.log("Models initialized successfully")
});

module.exports = {
    sequelize,
    Patient,
    Caretaker,
    Cabinet,
    CabinetBox,
    Medication,
    NDC,
    Session,
    SessionIntake,
    Schedule
};