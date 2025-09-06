const { promisify } = require("util");

const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const User = require("../model/userModel");
const Email = require("../utils/Email");

const AppError = require("../utils/appError");
const catchAsync = require("../utils/catchAsync");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);
  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true, // prevent XSS attacks || recieve and store and send it
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true; //will be send in encrypted in https || will only activate in https

  res.cookie("jwt", token, cookieOptions);

  // remove the password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

exports.signup = catchAsync(async (req, res, next) => {
  const newUser = await User.create({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    passwordChangedAt: req.body.passwordChangedAt,
    role: req.body.role,
    passwordResetToken: req.body.passwordResetToken,
    passwordResetExpires: req.body.passwordResetExpires,
  });

  createSendToken(newUser, 201, res);
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  //1)check if email and password exist
  if (!email || !password) {
    return next(new AppError("please provide email and password", 400));
  }
  if (typeof email !== "string" || typeof password !== "string") {
    return next(new AppError("Invalid input data", 400));
  }

  //2) check if the user exist && password is correct
  const user = await User.findOne({ email: email }).select("+password");
  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError("Incorrect email or password", 401)); //401 unauthorized
  }

  //3) if everthing ok, send the token to the client
  createSendToken(user, 200, res);
});

exports.logout = (req, res) => {
  res.cookie("jwt", "", {
    expires: new Date(Date.now() + 0), // expires in 0 secondes
    httpOnly: true,
  });

  res.status(200).json({
    status: "success",
    message: "Logged out succesfully",
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  // 1) getting the token and check it its exist
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError("You are not log in! Please log in to get access.", 401)
    );
  }

  // 2) verification Token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
  // console.log(decoded);

  // 3) check if user still exist
  const currentUser = await User.findById(decoded.id);

  if (!currentUser) {
    return next(
      new AppError("The user belonging to this token does no longer exist", 401)
    );
  }

  // 4) Check if user changed password after the token was issued
  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError("User recently changed password! Please log in again.", 401)
    );
  }

  // GRANT ACCESS TO PROTECTED ROUTES
  //req is the data that travel from middleware to middleware
  req.user = currentUser;
  next();
});

exports.checkIfUserExist = async (req, res, next) => {
  try {
    const token =
      (req.headers.authorization?.startsWith("Bearer") &&
        req.headers.authorization.split(" ")[1]) ||
      req.cookies?.jwt;

    if (!token) return next(); // no user, proceed as public

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) return next(); // treat as public

    // (optional) check tokenVersion or blacklist here

    req.user = currentUser;
    next();
  } catch (err) {
    // Don’t block the route; just proceed as unauthenticated
    return next();
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }

    next();
  };
};

exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) get user based on email
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError("There is no user with that email address", 404));
  }

  // 2) generate random token
  const resetToken = user.createPasswordResetToken();
  // save the modified document
  await user.save({ validateBeforeSave: false });

  // 3) send it as email
  try {
    const resetURL = `${req.protocol}://${req.get(
      "host"
    )}/api/v1/user/resetPassword/${resetToken}`;

    await new Email(user, resetURL).sendPasswordReset(resetToken);

    res.status(200).json({
      status: "success",
      message: "Token sent to email",
    });
  } catch (error) {
    console.error(
      "DEBUG: Detailed error in forgotPassword email sending:",
      error
    );

    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError(
        "There was an error sending the email. Try again later!",
        500 //error that happend in the server
      )
    );
  }
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  //1) Get user based on token
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  //2) If token has not expired, and there is user, set new password
  if (!user) {
    return next(new AppError("Token is invalid or has expired", 400)); //bad request
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  user.passwordResetExpires = undefined;
  user.passwordResetToken = undefined;
  await user.save(); //now we want to validate password

  //3) Update changePasswordAt property for the user
  user.passwordChangedAt = Date.now();

  //4) Log the user in, send JWT to client
  createSendToken(user, 200, res);
});

exports.updatePassword = catchAsync(async (req, res, next) => {
  //1) Get user from the collection
  const user = await User.findById(req.user.id).select("+password");

  //2) Check if the posted password is correct
  const correct = await user.correctPassword(
    req.body.passwordCurrent,
    user.password
  );
  if (!correct) {
    return next(new AppError("Your current password is wrong.", 401));
  }

  //3) If the password is correct then updtate the password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;

  await user.save();
  //User.findByIdAndUpdate will NOT word as intended!

  //4) Log use in, send JWT
  createSendToken(user, 200, res);
});

// exports.isLoggedIn;  // not needed
