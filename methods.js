const { Patient, Caretaker, Session, NDC, SessionIntake, Medication, sequelize, Cabinet, CabinetBox, Schedule } = require('./database');
const constants = require("./constants");
const axios = require("axios");
const utils = require("./utils");
const _ = require('lodash'); // Lodash makes grouping easier

const nodemailer = require('nodemailer');
const Handlebars = require('handlebars');

Handlebars.registerHelper('ifEquals', function (arg1, arg2, options) {
    return (arg1 == arg2) ? options.fn(this) : options.inverse(this);
});


// Portal Endpoints

/**
 * Renders the profile page with patient and caretaker data.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 */
const profile = async (req, res) => {
    if (req.session.user) {
        try {
            return res.render('profile', {
                patients: await getAllPatients(),
                careTaker: await getCaretaker(req.session.user),
            });
        } catch (error) {
            console.error(error);
        }
    } else {
        res.redirect('/login');
    }
}

const getMedicationsWithDetails = async (patientId) => {
    try {
        if (typeof patientId !== 'string') {
            console.error('Error fetching medications: Invalid patient ID type');
            return [];
        }

        // Assuming Medication has a foreign key relationship with NDC and CabinetBox
        const medications = await Medication.findAll({
            include: [
                {
                    model: NDC,
                    attributes: ['code']
                },
                {
                    model: CabinetBox,
                    attributes: ['box', 'quantity']
                },
            ]
        });

        return medications.map(medication => {
            const medicationJSON = medication.toJSON();
            return {
                ...medicationJSON,
                ndc: medicationJSON.NDCs?.[0]?.code,
                box: medicationJSON.CabinetBoxes?.[0]?.box,
                quantity: medicationJSON.CabinetBoxes?.[0]?.quantity,
            };
        });
    } catch (err) {
        console.error('Error fetching medications with details', err);
        throw err;
    }
};

const getMedicationSchedules = async (patientId) => {
    try {
        if (typeof patientId !== 'string') {
            console.error('Error fetching medication schedules: Invalid patient ID type');
            return [];
        }

        const schedules = await Schedule.findAll({
            where: { patient_id: patientId },
            include: [
                {
                    model: Medication
                },
                {
                    model: SessionIntake // Include session intakes
                },
            ]
        });

        return schedules.map(schedule => schedule.toJSON());
    } catch (err) {
        console.error('Error fetching medication schedules', err);
        throw err;
    }
};

const getSessionIntakesForMedicationIds = async (medicationIds) => {
    try {
        const sessionIntakes = await SessionIntake.findAll({
            where: { medication_id: medicationIds }
        });
        return sessionIntakes.map(intake => intake.toJSON());
    } catch (error) {
        console.error('Error fetching session intakes for medication IDs:', error);
        throw error;
    }
};


const getIngestionChartData = async (req, res) => {
    try {
        const session_intakes = await SessionIntake.findAll();
        var dict_session_intakes = {};
        session_intakes.map(intake => {
            if (dict_session_intakes[intake.medication_id] === undefined) {
                dict_session_intakes[intake.medication_id] = [(intake.end_time - intake.start_time) / 1000, 1];
            } else {
                dict_session_intakes[intake.medication_id][0] += (intake.end_time - intake.start_time) / 1000;
                dict_session_intakes[intake.medication_id][1] += 1;
            }
        })
        var final_array = [];
        for (let key in dict_session_intakes) {
            const medication = await getMedicationById(key);
            if (medication) { // Check if medication exists
                final_array.push({
                    name: medication.brand_name,
                    y: dict_session_intakes[key][0] / dict_session_intakes[key][1]
                });
            }
        }
        return final_array;
    } catch (error) {
        console.error('Error in getIngestionChartData:', error);
        throw error;
    }
}


const getFilterMedicationData = (medicationDetails) => {
    try {
        return medicationDetails.filter(medication => medication.box !== undefined && medication.quantity !== undefined)
            .sort((a, b) => parseInt(a.box) - parseInt(b.box));
    } catch (error) {
        console.error('Error in getFilterMedicationData:', error);
        throw error;
    }
};


const convertDayToNumber = (dayName) => {
    const dayMap = {
        'Sunday': 0,
        'Monday': 1,
        'Tuesday': 2,
        'Wednesday': 3,
        'Thursday': 4,
        'Friday': 5,
        'Saturday': 6
    };
    return dayMap[dayName];
}

/**
 * Renders the patient page with patient information and caretaker options.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 *
 * @returns {undefined}
 */
const patient = async (req, res) => {
    if (req.session.user) {
        try {
            const patientDetails = await getPatient(req.query.id);
            const caretakerDetails = await getCaretaker(patientDetails.caretaker_id);
            const medicationDetails = await getMedicationsWithDetails(patientDetails.id);
            const scheduleDetails = await getMedicationSchedules(patientDetails.id);
            const medicationIds = scheduleDetails.map(schedule => schedule.medication_id);

            // Fetch session intakes for medication IDs
            const sessionIntakes = await getSessionIntakesForMedicationIds(medicationIds);

            // Combine session intakes with schedule details
            const schedulesWithIngestion = scheduleDetails.map(schedule => {
                const sessionIntake = sessionIntakes.find(intake => intake.medication_id === schedule.medication_id && isIngestedOnDay(intake, schedule));
                const ingested = sessionIntake ? sessionIntake.ingested : null; // Get ingested value or null if not found for the day
                return {
                    ...schedule,
                    ingested: ingested // Assign ingested value
                };
            });

            // Rendering logic for session intake value
            const sessionIntakeDisplay = schedulesWithIngestion.map(schedule => {
                const ingested = schedule.ingested;
                let displayValue = '';
                if (ingested === 1) {
                    displayValue = 'true';
                } else if (ingested === 0) {
                    displayValue = 'false';
                }
                // If ingested is null or undefined, displayValue remains blank
                return displayValue;
            });

            console.log("Schedules with ingestion:", schedulesWithIngestion);
            const ingestionChartData = await getIngestionChartData(patientDetails.id);
            const sessionDetails = await getAlarmResponseTime(patientDetails.id);
            const ingestionFailureData = await getMedicationFailureRate(patientDetails.id);
            const filterMedicationData = getFilterMedicationData(medicationDetails);

            console.log("scheduleDetails =>", scheduleDetails);
            return res.render('patient', {
                patient: patientDetails,
                careTaker: caretakerDetails,
                medicationData: filterMedicationData,
                schedules: schedulesWithIngestion, // Use schedulesWithIngestion instead of scheduleDetails
                sessionIntake: sessionIntakeDisplay, // Rendered session intake display values
                sessionDetails: JSON.stringify(sessionDetails),
                ingestionChartData: JSON.stringify(ingestionChartData),
                ingestionFailureData: JSON.stringify(ingestionFailureData)
            });
        } catch (error) {
            console.error(error);
        }
    } else {
        res.redirect('/login');
    }
}

// Helper function to check if session intake occurred on the same day as the schedule
const isIngestedOnDay = (sessionIntake, schedule) => {
    // Extracting the day from the session intake start time
    const intakeDay = new Date(sessionIntake.start_time).getDay();
    return intakeDay === schedule.day;
};



// API Endpoints

/**
 * Searches for medications based on the provided search query.
 *
 * @async
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise} A promise representing the search results.
 * @throws {Error} If an error occurs during the search process.
 * @description This function takes a search query as input, constructs a query string,
 * sends a request to the FDA API, and returns the filtered medication data.
 */
const search_medications = async (req, res) => {
    const searchQuery = req.params.searchQuery;
    const query = `search=(openfda.brand_name:"${searchQuery}" OR openfda.generic_name:"${searchQuery}"OR openfda.product_ndc:"${searchQuery}")`;
    const url = `${constants.FDABaseUrl}?${query}&limit=10`;

    try {
        const response = await axios.get(url);
        if (response.data.results) {
            const filteredMedications = utils.mapMedicationData(response.data);
            res.json(filteredMedications);
        } else {
            res.json([]);
        }
    } catch (error) {
        res.status(404).json([]);
    }
}

/**
 * Retrieves medication data from FDA API based on the provided ID.
 *
 * @param {object} req - The request object.
 * @param {object} res - The response object.
 * @return {Promise<void>} - The async function returns nothing directly, but
 *                           modifies the response object.
 */
const get_medication = async (req, res) => {
    const id = req.params.id;
    const query = `search=(id:"${id}")`;
    const url = `${constants.FDABaseUrl}?${query}&limit=1`;

    try {
        const response = await axios.get(url);
        if (response.data.results) {
            const filteredMedications = utils.mapMedicationData(response.data);
            res.json(filteredMedications[0]);
        } else {
            res.json({});
        }
    } catch (error) {
        res.status(404).send({ message: 'No medication found', code: error.code });
    }
}

/**
 * Function to handle the process of posting medication data.
 *
 * @async
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise} A promise that resolves when the medication data is successfully posted.
 */
const post_medication = async (req, res) => {
    const cabinet_id = req.body.cabinet_id;
    const t = await sequelize.transaction();

    try {
        if (cabinet_id === undefined) {
            throw Error;
        }
        const medications = req.body.medications;
        for (const med of medications) {
            await createMedication(med.medication_id);
            await CabinetBox.upsert({
                cabinet_id: cabinet_id,
                medication_id: med.medication_id,
                box: med.box,
                quantity: med.quantity
            });
        }
        await t.commit();
        res.status(200).send({ message: 'Medication received successfully.' });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(400).send({ message: 'Bad Request' });
    }
}

/**
 * Create medication schedules for a patient.
 * @async
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {void}
 */
const post_schedule = async (req, res) => {
    const cabinet_id = req.body.cabinet_id;
    const patient_id = req.body.patient_id;
    const t = await sequelize.transaction();

    try {
        if (patient_id === undefined || cabinet_id === undefined) {
            throw Error;
        }
        const medication_schedules = req.body.medications;

        for (const schedule of medication_schedules) {
            await Schedule.create({
                patient_id: patient_id,
                medication_id: schedule.medication_id,
                day: schedule.day,
                time: schedule.time,
            });
        }
        await t.commit();
        res.status(200).send({ message: 'Schedule received successfully.' });
    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(400).send({ message: 'Bad Request' });
    }
}

/**
 * Creates a session and session intakes for the given request and response objects.
 *
 * @async
 * @param {Object} req - The request object contains the cabinet ID, patient ID, and session intakes.
 * @param {Object} res - The response object used to send the session status.
 * @returns {Promise<void>} - A Promise that resolves when the session is created and committed successfully, otherwise rejects with an error.
 */



const getCaretakerEmail = async (patientId) => {
    try {
        // Find the patient by ID and include the associated caretaker
        const patient = await Patient.findOne({
            where: { id: patientId },
            include: [{
                model: Caretaker,
                attributes: ['email']
            }]
        });

        // Extract the caretaker's email from the patient object
        if (patient && patient.Caretaker) {
            return {
                patient: patient.toJSON(),
                caretakerEmail: patient.Caretaker.email
            };
        } else {
            throw new Error('Patient or caretaker not found.');
        }
    } catch (error) {
        console.error('Error fetching patient and caretaker email:', error);
        throw error;
    }
};


// Define email sending function using Outlook SMTP settings
const sendEmailToCaretaker = async (caretakerEmail) => {
    const transporter = nodemailer.createTransport({
        host: 'smtp-mail.outlook.com',
        port: 587,
        secure: false,
        auth: {
            user: 'caretaker.portal@outlook.com',
            pass: 'Capstone2023/2024'
        }
    });

    const mailOptions = {
        from: 'caretaker.portal@outlook.com',
        to: caretakerEmail,
        subject: 'Medication Intake Alert',
        text: `Dear Caretaker,\n\nThis is to inform you that patient has missed their medication intake.\n\nPlease take necessary action.`
    };

    try {
        console.log('Caretaker email:', caretakerEmail); // Log the caretaker's email address
        await transporter.sendMail(mailOptions);

        console.log('Email sent to caretaker:', caretakerEmail);
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
};

const post_session = async (req, res) => {
    const cabinet_id = req.body.cabinet_id;
    const patient_id = req.body.patient_id;
    const t = await sequelize.transaction();

    try {
        if (patient_id === undefined || cabinet_id === undefined) {
            throw Error;
        }
        const session_intakes = req.body.session_intakes;
        const session = await Session.create(req.body, { transaction: t });

        for (const intake of session_intakes) {

            await SessionIntake.create({
                medication_id: intake.medication_id,
                start_time: intake.start_time,
                ingest_time: intake.ingest_time,
                end_time: intake.end_time,
                ingested: intake.ingested,
                session_id: session.id
            }, { transaction: t });

            // Check if the medication was not ingested and send email to caretaker
            if (!intake.ingested) {
                //call function to get caretaker email by patient id 
                const caretakerEmail = await getCaretakerEmail(patient_id);
                // Send email to caretaker
                await sendEmailToCaretaker(caretakerEmail.caretakerEmail);
            }
        }

        await t.commit();
        res.status(200).send({ message: 'Session received successfully.' });

    } catch (err) {
        await t.rollback();
        console.error(err);
        res.status(400).send({ message: 'Bad Request' });
    }

}

// Functions


/**
 * Retrieves medication by ID from FDA API.
 *
 * @param {string} id - The ID of the medication to fetch.
 * @returns {Object|null} - The medication object if found, or null if not found.
 * @throws {Error} - If an error occurs while fetching the medication.
 */
const getMedicationById = async (id) => {
    const query = `search=(id:"${id}")`;
    const url = `${constants.FDABaseUrl}?${query}&limit=1`;

    try {
        const response = await axios.get(url);
        if (response.data.results) {
            const filteredMedications = utils.mapMedicationData(response.data);
            return filteredMedications[0];
        } else {
            return null;
        }
    } catch (error) {
        console.error("Error fetching medication:", error);
    }
}

/**
 * Creates or updates a medication by its ID.
 *
 * @param {number} id - The ID of the medication.
 * @returns {Promise} - A promise that resolves to the created or updated medication.
 */
const createMedication = async (id) => {
    const medication = await getMedicationById(id);
    await Medication.upsert(medication);
    for (const ndc of medication.product_ndc) {
        await NDC.upsert({
            code: ndc,
            medication_id: id
        })
    }
    return medication;
}

/**
 * Retrieves all patients along with their associated caretaker information.
 *
 * @async
 * @returns {Promise<Array<object>>} - Array of patient objects
 *
 * @throws {Error} if there is any error encountered while fetching patients for caretaker
 */
const getAllPatients = async () => {
    try {
        const patients = await Patient.findAll({
            include: [{
                model: Caretaker, attributes: ['first_name', 'last_name']
            }]
        });

        return patients.map(patient => {
            const patientJson = patient.toJSON();

            return {
                ...patientJson,
                caretaker_first_name: patientJson.Caretaker.first_name,
                caretaker_last_name: patientJson.Caretaker.last_name,
                Caretaker: undefined
            };
        });

    } catch (err) {
        console.error('Error fetching patients for caretaker:', err);
        throw err;
    }
}

/**
 * Retrieves a patient with the specified ID from the database.
 *
 * @async
 * @param {string} id - The ID of the patient to retrieve.
 * @returns {Promise<Object|null>} - A promise that resolves with the patient object if found, or null if not found.
 * @throws {Error} - If there was an error fetching the patient.
 */
const getPatient = async (id) => {
    try {
        const patient = await Patient.findByPk(id);
        return patient ? patient.toJSON() : null;
    } catch (err) {
        console.error('Error fetching patient', err);
        throw err;
    }
};


/**
 * Fetches all caretakers from the database.
 *
 * @returns {Promise} A promise that resolves to an array of caretaker objects.
 * @throws {Error} If there is an error fetching caretakers from the database.
 */
const getAllCaretakers = async () => {
    try {
        const caretakers = await Caretaker.findAll();
        return caretakers.map(caretaker => caretaker.toJSON());
    } catch (err) {
        console.error('Error fetching caretakers', err);
        throw err;
    }
};


/**
 * Fetches a caretaker by id.
 *
 * @param {number} id - The id of the caretaker.
 * @returns {Promise<Object|null>} - A promise that resolves to the caretaker object
 *                                   if found, otherwise null.
 * @throws {Error} - If there was an error fetching the caretaker.
 */
const getCaretaker = async (id) => {
    try {
        const caretaker = await Caretaker.findByPk(id);
        return caretaker ? caretaker.toJSON() : null;
    } catch (err) {
        console.error('Error fetching caretaker', err);
        throw err;
    }
};

/**
 * Retrieves the medication schedules for a given patient.
 *
 * @param {number} patientId - The ID of the patient.
 * @returns {Promise<Array>} A promise that resolves to an array of medication schedules for the patient.
 * @throws {Error} If there is an error fetching the medication schedules.
 */
const getPatientMedicationSchedule = async (patientId) => {
    try {
        const schedules = await Schedule.findAll({
            where: { patient_id: patientId },
            include: [
                {
                    model: Medication,
                    required: true
                },
                {
                    model: Patient,
                    required: true,
                    where: { id: patientId }
                }
            ]
        });

        const groupedByMedicationName = _.groupBy(schedules, (schedule) => schedule.Medication.brand_name);

        return Object.keys(groupedByMedicationName).map(medicationName => ({
            brand_name: medicationName,
            schedules: groupedByMedicationName[medicationName]
        }));
    } catch (error) {
        console.error('Error fetching medication schedules for patient:', error);
        throw error;
    }
};

/**
 * Retrieves the medications for a given patient.
 *
 * @async
 * @param {number} patientId - The ID of the patient.
 * @returns {Promise<Object[]>} Array of medication objects.
 * @throws {Error} If there is an error fetching medications.
 */
const getPatientMedications = async (patientId) => {
    try {
        const patient = await Patient.findByPk(patientId, {
            include: [{
                model: Cabinet,
                include: [{
                    model: CabinetBox,
                    include: [{
                        model: Medication,
                        include: [{
                            model: NDC,
                        }],
                    }]
                }]
            }]
        });

        if (!patient || !patient.Cabinet) {
            console.log('Patient or patient cabinet not found');
            return [];
        }

        return patient.Cabinet.CabinetBoxes.reduce((acc, cabinetBox) => {
            if (cabinetBox.Medication) {
                acc.push({
                    // id: cabinetBox.Medication.id,
                    NDC: cabinetBox.Medication.NDCs,
                    brand_name: cabinetBox.Medication.brand_name,
                    generic_name: cabinetBox.Medication.generic_name,
                    box: cabinetBox.box,
                    quantity: cabinetBox.quantity,

                    // Include other attributes as needed
                });
            }
            return acc;
        }, []);
    } catch (error) {
        console.error('Error fetching medications for patient:', error);
        throw error;
    }
};


/**
 * Calculates the average of ingestion times for each medication in SessionIntake.
 *
 * @param {string} id - The ID of the patient.
 * @returns {Promise<Array>} - A list of medications and their historical average ingestion times.
 * @throws {Error} - If there was an error during the calculation of ingestion times.
 */
const getIngestionTime = async (id) => {
    try {
        const sessionIntakes = await SessionIntake.findAll({
            include: [
                {
                    model: Medication,
                    required: true
                },
                {
                    model: Patient,
                    required: true,
                    where: { id: id }
                }
            ]
        });

        const ingestionTimes = sessionIntakes.map(intake => {
            const startTime = new Date(intake.start_time);
            const endTime = new Date(intake.end_time);
            const ingestionTime = (endTime - startTime) / 60; // in minutes
            return {
                medication_id: intake.medication_id,
                brand_name: intake.Medication.brand_name,
                generic_name: intake.Medication.generic_name,
                ingestionTime: ingestionTime
            };
        });

        const groupedByMedicationId = _.groupBy(ingestionTimes, (item) => item.medication_id);

        return Object.keys(groupedByMedicationId).map(medicationId => {
            const avgIngestionTime = _.meanBy(groupedByMedicationId[medicationId], 'ingestionTime');
            return {
                brand_name: groupedByMedicationId[medicationId][0].brand_name,
                generic_name: groupedByMedicationId[medicationId][0].generic_name,
                average_ingestion_time: avgIngestionTime
            };
        });
    } catch (error) {
        console.error('Error calculating average ingestion times:', error);
        throw error;
    }
};

// const getIngestionTime = async (id) => {
//
// };

const getAlarmResponseTime = async (id) => {
    try {
        const sessions = await Session.findAll({
            where: { patient_id: id },
        });

        const dict_session_details = {};
        sessions.map(session => {
            if (dict_session_details[session.id] === undefined) {
                dict_session_details[session.id] = (session.end_time - session.start_time) / 1000;
            }
        });

        const final_dict = {};
        const session_intakes = await SessionIntake.findAll();
        for (let key in dict_session_details) {
            const res = session_intakes.filter(intake => intake.session_id === key);
            if (res.length > 0) {
                const medicationId = res[0].medication_id;
                if (medicationId) { // Check if medication_id exists
                    if (final_dict[medicationId] === undefined) {
                        final_dict[medicationId] = [dict_session_details[key], 1];
                    } else {
                        final_dict[medicationId][0] += dict_session_details[key];
                        final_dict[medicationId][1] += 1;
                    }
                }
            }
        }

        const final_array = [];
        for (let key in final_dict) {
            const medicationDetails = await getMedicationById(key);
            if (medicationDetails) {
                final_array.push({
                    name: medicationDetails.brand_name,
                    y: final_dict[key][0] / final_dict[key][1]
                });
            }
        }
        return final_array;
    } catch (error) {
        console.error('Error calculating alarm response time:', error);
        throw error;
    }
};

const getMedicationFailureRate = async (id) => {
    try {
        const session_intakes = await SessionIntake.findAll();
        var dict_failure_calculation = {};
        session_intakes.map(intake => {
            if (dict_failure_calculation[intake.medication_id] === undefined) {
                if (intake.ingested)
                    dict_failure_calculation[intake.medication_id] = { ingested: 1, notIngested: 0, total: 1 };
                else
                    dict_failure_calculation[intake.medication_id] = { ingested: 0, notIngested: 1, total: 1 }
            } else {
                if (intake.ingested)
                    dict_failure_calculation[intake.medication_id].ingested += 1;
                else
                    dict_failure_calculation[intake.medication_id].notIngested += 1;
                dict_failure_calculation[intake.medication_id].total += 1;
            }
        })
        var final_array = [];
        for (let key in dict_failure_calculation) {
            const medicationDetails = await getMedicationById(key);
            if (medicationDetails) { // Check if medication exists
                final_array.push(
                    {
                        name: medicationDetails.brand_name,
                        y: dict_failure_calculation[key].notIngested === 0 ? 0 : (dict_failure_calculation[key].notIngested / dict_failure_calculation[key].total) * 100
                    }
                );
            }
        }
        return final_array;
    } catch (error) {
        console.error('Error in getMedicationFailureRate:', error);
        throw error;
    }
};


module.exports = {
    profile,
    patient,
    search_medications,
    get_medication,
    post_medication,
    post_schedule,
    post_session,
    getPatientMedicationSchedule,
    getPatientMedications,
    getIngestionTime,
    getCaretakerEmail,
    sendEmailToCaretaker
}