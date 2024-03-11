const bcrypt = require('bcrypt');

const {Caretaker} = require('./database');


const login_caretaker = async (req, res) => {
    const {email, password} = req.body;
    try {
        const caretaker = await Caretaker.findOne({ where: { email }});
        if (caretaker) {
            const isMatch = await bcrypt.compare(password, caretaker.password);
            if (isMatch) {
                req.session.user = caretaker.id;
                return res.redirect('profile');
            }
        }
        return res.render('login', {message: "Invalid Credentials"});
    }
    catch (err) {
        console.error(err);
        return res.render('login', {message: "An error occurred"});
    }
};

const isStrongPassword = (password) => {
    var dict_pass_check = {
        smallCase: [],
        upperCase: [],
        specialChars: [],
        digits: []
    }
    for (let i = 0; i < password.length; i++) {
        if (password[i] >= 'a' && password[i] <= 'z') {
            dict_pass_check.smallCase.push(password[i]);
        }
        else if (password[i] >= 'A' && password[i] <= 'Z') {
            dict_pass_check.upperCase.push(password[i]);
        }
        else if (password[i] >= '0' && password[i] <= '9') {
            dict_pass_check.digits.push(password[i]);
        }
        else {
            dict_pass_check.specialChars.push(password[i]);
        }
    }

    if (password.length < 8) {
        return "Password must be atleast 8 Characters Long";
    } else if (dict_pass_check.smallCase.length === 0) {
        return "Password must contain atleast one small case alphabet [a-z]";
    }
    else if (dict_pass_check.upperCase.length === 0) {
        return "Password must contain atleast one upper case alphabet [A-Z]";
    } else if (dict_pass_check.digits.length === 0) {
        return "Password must contain atleast one digit [0-9]";
    } else if (dict_pass_check.specialChars.length === 0) {
        return "Password must contain atleast one of these special characters [@,_,-,.]";
    } else {
        return true;
    }
}


// TODO caretaker registration should be sent to an administrator for confirmation/permission
const register_caretaker = async (req, res) => {
    const { first_name, last_name, email, password, _ } = req.body;
    try {
        const passCheck = isStrongPassword(password);
        if (passCheck !== true) {
            return res.render('register', {
                message: passCheck
            })
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await Caretaker.create({
            email,
            password: hashedPassword,
            first_name,
            last_name
        });
        return res.redirect('login');
    } catch (err) {
        console.error(err);
        return res.render('register', { message: "An error occurred" });
    }
}

const logout_caretaker = async (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error(err);
        } else {
            return res.redirect('login');
        }
    });
}

module.exports = {
    login_caretaker,
    register_caretaker,
    logout_caretaker
}