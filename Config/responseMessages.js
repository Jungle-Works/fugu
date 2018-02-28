

exports.ERROR = {
  eng : {
    BUSINESS_UNREGISTERED : {
      statusCode    : 401,
      customMessage : 'User has not yet registered his business yet',
      type          : "BUSINESS_UNREGISTERED"
    },
    EMAIL_TOKEN_NOT_VERIFIED : {
      statusCode    : 200,
      customMessage : 'Email Token is not valid',
      type          : "EMAIL_TOKEN_NOT_VERIFIED"
    },
    ALL_EMAILS_ALREADY_INVITED : {
      statusCode    : 200,
      customMessage : 'User(s) are already invited/registered',
      type          : "ALL_EMAILS_ALREADY_INVITED"
    },
    ALREADY_REGISTER : {
      statusCode    : 400,
      customMessage : 'Email already registered with us',
      type          : "ALREADY_REGISTER"
    },
    WRONG_LABEL_ID : {
      statusCode    : 400,
      customMessage : 'Wrong Label ID Passed',
      type          : "WRONG_LABEL_ID"
    },
    CHANNEL_ALREADY_CLOSED : {
      statusCode    : 400,
      customMessage : 'This channel is already closed',
      type          : "CHANNEL_ALREADY_CLOSED"
    },
    CHANNEL_ALREADY_OPEN : {
      statusCode    : 400,
      customMessage : 'This channel is already open',
      type          : "CHANNEL_ALREADY_OPEN"
    },
    TAG_ALREADY_ASSIGNED : {
      statusCode    : 400,
      customMessage : 'This tag is already assigned',
      type          : "TAG_ALREADY_ASSIGNED"
    },
    AGENT_ID_DOES_NOT_EXIST : {
      statusCode    : 400,
      customMessage : 'This agent email does not exist',
      type          : "AGENT_ID_DOES_NOT_EXIST"
    },
    TAG_ALREADY_EXISTS : {
      statusCode    : 400,
      customMessage : 'This tag already exists',
      type          : "TAG_ALREADY_EXISTS"
    },
    ALREADY_REQUESTED : {
      statusCode    : 400,
      customMessage : 'Already made a request',
      type          : "ALREADY_REQUESTED"
    },
    ALREADY_REQUESTED_USER : {
      statusCode    : 400,
      customMessage : 'Your request is in progress, we will get back to you soon',
      type          : "ALREADY_REQUESTED_USER"
    },
    NO_CHANGES : {
      statusCode    : 401,
      customMessage : 'No changes made while editing',
      type          : "NO_CHANGES"
    },
    CHANNEL_ALREADY_EXISTS : {
      statusCode    : 400,
      customMessage : 'This channel already exists.',
      type          : "CHANNEL_ALREADY_EXISTS"
    },
    AGENT_ALREADY_EXISTS : {
      statusCode    : 400,
      customMessage : 'This agent email already exists.',
      type          : "AGENT_ALREADY_EXISTS"
    },
    AGENT_ALREADY_ASSIGNED : {
      statusCode    : 401,
      customMessage : 'This agent is already assigned to this channel.',
      type          : "AGENT_ALREADY_ASSIGNED"
    },
    CUSTOMER_ALREADY_REGISTER : {
      statusCode    : 401,
      customMessage : 'Customer phone number already registered with us.',
      type          : "CUSTOMER_ALREADY_REGISTER"
    },
    INCORRECT_PASSWORD : {
      statusCode    : 401,
      customMessage : 'Incorrect password',
      type          : 'INCORRECT_PASSWORD'
    },
    ACCOUNT_BLOCKED : {
      statusCode    : 401,
      customMessage : 'Your account has been deactivated by the Admin.',
      type          : 'ACCOUNT_BLOCKED'
    },
    ACCOUNT_NOT_REGISTERED : {
      statusCode    : 401,
      customMessage : 'Your account not registered with any business yet',
      type          : 'ACCOUNT_NOT_REGISTERED'
    },
    INCORRECT_DELIVERY_MODE : {
      statusCode    : 401,
      customMessage : 'Incorrect delivery mode selected',
      type          : 'INCORRECT_DELIVERY_MODE'
    },
    INVALID_TOKEN : {
      statusCode    : 403,
      customMessage : 'Your session has expired. Please login again.',
      type          : 'INVALID_TOKEN'
    },
    INVALID_TOKEN_ACCESS_DENIED : {
      statusCode    : 403,
      customMessage : 'Session Expired, Please Login Again',
      type          : 'INVALID_TOKEN'
    },
    ACCESS_DENIED : {
      statusCode    : 405,
      customMessage : 'Access Denied',
      type          : 'ACCESS_DENIED'
    },
    INVALID_OTP_TOKEN : {
      statusCode    : 400,
      customMessage : 'Invalid OTP token',
      type          : "INVALID_OTP_TOKEN"
    },
    TRIAL_EXPIRED_OWNER : {
      statusCode    : 402,
      customMessage : 'Your free trial has expired, Please navigate to your dashboard',
      type          : 'TRIAL_EXPIRED_OWNER'
    },
    TRIAL_EXPIRED : {
      statusCode    : 402,
      customMessage : 'Your free trial has expired, Please contact your business admin',
      type          : 'TRIAL_EXPIRED'
    },
    POS_NOT_ENABLED : {
      statusCode    : 401,
      customMessage : 'Currently you do not owe services of this facility. Please contact our customer care for enabling this feature',
      type          : 'POS_NOT_ENABLED'
    },
    NO_RECORD : {
      statusCode    : 404,
      customMessage : 'No record found.',
      type          : 'NO_RECORD'
    },
    USER_BLOCKED : {
      statusCode    : 401,
      customMessage : 'Your account has been blocked by the Admin user',
      type          : 'USER_BLOCKED'
    },
    ALREADY_EXIST : {
      statusCode    : 400,
      customMessage : 'Email/Phone number already exists.',
      type          : 'ALREADY_EXIST'
    },
    CATEGORY_ALREADY_EXIST : {
      statusCode    : 401,
      customMessage : 'This Category already exists.',
      type          : 'CATEGORY_ALREADY_EXIST'
    },
    USER_ALREADY_REGISTERED : {
      statusCode    : 401,
      customMessage : 'Email already exists.',
      type          : 'USER_ALREADY_REGISTERED'
    },
    UNAUTHORIZED : {
      statusCode    : 401,
      customMessage : 'You are not authorized to perform this action',
      type          : 'UNAUTHORIZED'
    },
    DELIVERY_MODE_NOT_SELECTED : {
      statusCode    : 401,
      customMessage : 'Please select a Delivery Mode for Delivery type order',
      type          : 'DELIVERY_MODE_NOT_SELECTED'
    },
    INVALID_EMAIL : {
      statusCode    : 401,
      customMessage : 'This email address is not associated with any account.',
      type          : 'INVALID_EMAIL'
    },
    INVALID_CREDENTIALS : {
      statusCode    : 401,
      customMessage : 'Oops! The Email or Password is incorrect.',
      type          : 'INVALID_CREDENTIALS'
    },
    INVALID_PASSWORD : {
      statusCode    : 401,
      customMessage : 'Wrong Password. Try again or click Forgot Password to reset it.',
      type          : 'INVALID_PASSWORD'
    },
    NOT_REGISTERED : {
      statusCode    : 401,
      customMessage : 'Email is not registered with us !!',
      type          : 'INVALID_CREDENTIALS'
    },
    INVALID_ACCESS_TOKEN : {
      statusCode    : 403,
      customMessage : 'Oops! Your session has expired.',
      type          : 'INVALID_ACCESS_TOKEN'
    },
    INVALID_SUPER_ADMIN_TOKEN : {
      statusCode    : 401,
      customMessage : ' Invalid Parameters / Super Admin Token ',
      type          : 'INVALID_SUPER_ADMIN_TOKEN'
    },
    INVALID_PARAMETERS : {
      statusCode    : 401,
      customMessage : ' Invalid Parameters / Bad Request ',
      type          : 'INVALID_PARAMETERS'
    },
    DEFAULT : {
      statusCode    : 400,
      customMessage : 'Something went wrong.',
      type          : 'DEFAULT'
    },
    INVALID_RESELLER_TOKEN : {
      status        : 401,
      customMessage : 'Reseller Token Invalid',
      type          : 'INVALID_TOKEN'
    },
    INVALID_BUSINESS_ID : {
      status        : 401,
      customMessage : 'Invalid Business Id',
      type          : 'INVALID_BUSINESS_ID'
    },
    RESELLER_DISABLED : {
      statusCode    : 401,
      customMessage : 'Reseller disabled',
      type          : 'RESELLER_DISABLED'
    },
    RESELLER_BUSINESS_INFO : {
      statusCode    : 400,
      customMessage : 'Error while fetching Reseller Business info',
      type          : 'RESELLER_INFO'
    },
    RESELLER_BUSINESS_UPDATE_FAILURE : {
      statusCode    : 400,
      customMessage : 'Error while updating Business info from Reseller',
      type          : 'RESELLER_BUSINESS_UPDATE_FAILURE'
    },
    RESELLER_CREATE_BUSINESS : {
      statusCode    : 400,
      customMessage : 'Error while creating a reseller business',
      type          : 'RESELLER_BUSINESS_CREATE'
    },
    RESELLER_UPDATE_FAILURE : {
      statusCode    : 400,
      customMessage : 'Error while updating a reseller info',
      type          : 'RESELLER_BUSINESS_CREATE'
    },
    RESELLER_CREATE_FAILURE : {
      statusCode    : 400,
      customMessage : 'Error while creating a reseller',
      type          : 'RESELLER_CREATE_FAILURE'
    },
    RESELLER_PRESENT : {
      statusCode    : 400,
      customMessage : 'Reseller already present',
      type          : 'RESELLER_PRESENT'
    },
    INVALID_COMPONENT_KEY : {
      statusCode    : 401,
      customMessage : 'Invalid component key',
      type          : 'INVALID_COMPONENT_KEY'
    },
    USER_NOT_FOUND : {
      statusCode    : 400,
      customMessage : 'User does not exist',
      type          : 'USER_NOT_FOUND'
    },
    USER_REQUIRED : {
      statusCode    : 400,
      customMessage : 'User Required',
      type          : 'USER_REQUIRED'
    },
    PARAMETER_REQUIRED : {
      statusCode    : 400,
      customMessage : 'Parameters Required',
      type          : 'PARAMETER_REQUIRED'
    },
    ALERT_NOT_FOUND : {
      statusCode    : 404,
      customMessage : 'Alert Not Found',
      type          : 'ALERT_NOT_FOUND'
    },
    ALERT_ALREADY_CLOSED : {
      statusCode    : 400,
      customMessage : 'Alert Already Closed',
      type          : 'ALERT_ALREADY_CLOSED'
    },
    DATA_UNAVAILABLE : {
      statusCode    : 406,
      customMessage : 'DATA UNAVAILABLE',
      type          : 1
    }
  }
};

exports.SUCCESS = {
  NO_RECORD : {
    statusCode    : 200,
    customMessage : 'No such record found',
    type          : 'NO RECORD'
  },
  DATA_FETCHED_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Data Fetched Successfully',
    type          : 'DATA_FETCHED_SUCCESSFULLY'
  },
  ENTRY_ADDED_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Entry Added Successfully',
    type          : 'ENTRY_ADDED_SUCCESSFULLY'
  },
  BUSINESS_SIGNUP_SUCCESSFULL : {
    statusCode    : 200,
    customMessage : 'Business SignUp Successfully',
    type          : 'BUSINESS_SIGNUP_SUCCESSFULL'
  },
  BUSINESS_ACTIVATION_SUCCESSFUL : {
    statusCode    : 200,
    customMessage : 'Business Activation Successful',
    type          : 'BUSINESS_ACTIVATION_SUCCESSFUL'
  },
  BUSINESS_DEACTIVATION_SUCCESSFUL : {
    statusCode    : 200,
    customMessage : 'Business Deactivation Successful',
    type          : 'BUSINESS_DEACTIVATION_SUCCESSFUL'
  },
  BUSINESS_INFO_UPDATE_SUCCESSFUL : {
    statusCode    : 200,
    customMessage : 'Business Info Update Successful',
    type          : 'BUSINESS_INFO_UPDATE_SUCCESSFUL'
  },
  ENTRY_EDIT_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Entry Edit Successfully',
    type          : 'ENTRY_EDITED_SUCCESSFULLY'
  },
  TAG_CREATED_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Tag Created Successfully',
    type          : 'TAG_CREATED_SUCCESSFULLY'
  },
  TAGS_FETCHED_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Tags Fetched Successfully',
    type          : 'TAGS_FETCHED_SUCCESSFULLY'
  },
  TAGS_EDITED_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Tag Edited Successfully',
    type          : 'TAGS_EDITED_SUCCESSFULLY'
  },
  TAGS_ASSIGNED_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Tag Assigned Successfully',
    type          : 'TAGS_ASSIGNED_SUCCESSFULLY'
  },
  AGENT_ASSIGNED : {
    statusCode    : 200,
    customMessage : 'Agent Assigned Successfully',
    type          : 'AGENT_ASSIGNED'
  },
  CONVERSATION_MARKED_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Conversation Marked Successfully',
    type          : 'CONVERSATION_MARKED_SUCCESSFULLY'
  },
  ORDER_ADDED : {
    statusCode    : 201,
    customMessage : 'Order Added Successfully',
    type          : 'ORDER SUCCESSFUL'
  },
  DISCOUNT_ADDED : {
    statusCode    : 201,
    customMessage : 'Discount Added Successfully',
    type          : 'DISCOUNT_ADDED'
  },
  RECEIVED_USERS : {
    statusCode    : 200,
    customMessage : 'Received Users Successfully',
    type          : 'RECEIVED_USERS'
  },
  RECEIVED_CHANNELS : {
    statusCode    : 200,
    customMessage : 'Received Channels Successfully',
    type          : 'RECEIVED_CHANNELS'
  },
  DELIVERY_PROCESS_INITIATED : {
    statusCode    : 200,
    customMessage : 'Delivery Process Initiated',
    type          : 'DELIVERY_PROCESS_INITIATED'
  },
  ORDER_EDITED : {
    statusCode    : 201,
    customMessage : 'Order Edited Successfully',
    type          : 'ORDER_EDITED'
  },
  ADDRESS_DELETED : {
    statusCode    : 201,
    customMessage : 'Address Deleted Successfully',
    type          : 'ADDRESS_DELETED'
  },
  PASSWORD_CHANGED : {
    statusCode    : 201,
    customMessage : 'Password Changed Successfully',
    type          : 'PASSWORD_CHANGED'
  },
  REGISTERED : {
    statusCode    : 201,
    customMessage : 'Registered Successfully',
    type          : 'REGISTERED'
  },
  REGISTERED_DOCTOR : {
    statusCode    : 201,
    customMessage : 'Thanks for registering, we’ll be in touch soon to approve your request.',
    type          : 'REGISTERED_DOCTOR'
  },
  UPLOADED_SUCCESSFULLY : {
    statusCode    : 201,
    customMessage : 'Uploaded Successfully.',
    type          : 'UPLOADED_SUCCESSFULLY'
  },
  UPDATED_SUCCESSFULLY : {
    statusCode    : 201,
    customMessage : 'Updated Successfully.',
    type          : 'UPDATED_SUCCESSFULLY'
  },
  EMAIL_SENT : {
    statusCode    : 200,
    customMessage : 'Email Sent.',
    type          : 'EMAIL_SENT'
  },
  RESEND_OTP : {
    statusCode    : 200,
    customMessage : 'OTP has been sent successfully.',
    type          : 'RESEND_OTP'
  },
  NOTES_ADDED_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Notes Added Successfully',
    type          : 'NOTES_ADDED_SUCCESSFULLY'
  },
  CARD_ADDED : {
    statusCode    : 200,
    customMessage : "Card added successfully",
    type          : 'CARD_ADDED'
  },
  ITEM_ADDED : {
    statusCode    : 200,
    customMessage : "Item added successfully",
    type          : 'ITEM_ADDED'
  },
  ITEMS_IMPORTED : {
    statusCode    : 200,
    customMessage : "Items imported successfully",
    type          : 'ITEMS_IMPORTED'
  },
  CATEGORY_ADDED : {
    statusCode    : 200,
    customMessage : "Category added successfully",
    type          : 'CATEGORY_ADDED'
  },
  GROUP_ADDED : {
    statusCode    : 200,
    customMessage : "Permission Group added successfully",
    type          : 'GROUP_ADDED'
  },
  SUBCATEGORY_ADDED : {
    statusCode    : 201,
    customMessage : "Sub Category added successfully",
    type          : 'SUBCATEGORY_ADDED'
  },
  USER_ADDED : {
    statusCode    : 200,
    customMessage : "User added successfully",
    type          : 'USER_ADDED'
  },
  BUSINESS_ADDED : {
    statusCode    : 200,
    customMessage : "Business added successfully",
    type          : 'BUSINESS_ADDED'
  },
  REQUEST_ADDED : {
    statusCode    : 200,
    customMessage : "Business request added successfully",
    type          : 'REQUEST_ADDED'
  },
  MEMBERSHIP_ALREADY_EXIST : {
    statusCode    : 200,
    customMessage : "Membership already added.",
    type          : 'MEMBERSHIP_ALREADY_EXIST'
  },
  EDITED : {
    statusCode    : 200,
    customMessage : "Edited successfully",
    type          : 'EDITED'
  },
  AGENT_INVITATION_REVOKED : {
    statusCode    : 200,
    customMessage : "Agent Invitation is revoked",
    type          : 'AGENT_INVITATION_REVOKED'
  },
  APPOINTMENT_CANCELLED : {
    statusCode    : 200,
    customMessage : "Appointment cancelled successfully",
    type          : 'APPOINTMENT_CANCELLED'
  },
  BANK_ACCOUNT_ADDED : {
    statusCode    : 201,
    customMessage : "Bank account added successfully",
    type          : 'BANK_ACCOUNT_ADDED'
  },
  DEFAULT_CARD : {
    statusCode    : 201,
    customMessage : "Default card changed successfully.",
    type          : 'DEFAULT_CARD'
  },
  SERVICE_STARTED : {
    statusCode    : 201,
    customMessage : "Booking started successfully.",
    type          : 'SERVICE_STARTED'
  },
  SERVICE_ENDED : {
    statusCode    : 201,
    customMessage : "Booking ended successfully.",
    type          : 'SERVICE_ENDED'
  },
  RATING_DONE : {
    statusCode    : 200,
    customMessage : 'Rating done successfully.',
    type          : 'RATING_DONE'
  },
  BOOKING_REJECTED : {
    statusCode    : 201,
    customMessage : "Booking rejected successfully.",
    type          : 'BOOKING_REJECTED'
  },
  PROFILE_UPDATED : {
    statusCode    : 200,
    customMessage : 'Your profile has been updated successfully.',
    type          : 'PROFILE_UPDATED'
  },
  PHONE_NUMBER_UPDATE : {
    statusCode    : 200,
    customMessage : 'Please enter OTP for verify your phone number.',
    type          : 'PHONE_NUMBER_UPDATE'
  },
  BOOKING_ACCEPTED : {
    statusCode    : 200,
    customMessage : 'Booking accepted successfully',
    type          : "BOOKING_ACCEPTED"
  },
  EMAIL_TOKEN_VERIFIED : {
    statusCode    : 200,
    customMessage : 'Token Verified',
    type          : "EMAIL_TOKEN_VERIFIED"
  },
  OTP_TOKEN_VERIFIED : {
    statusCode    : 200,
    customMessage : 'Token Verified',
    type          : "OTP_TOKEN_VERIFIED"
  },
  APPOINTMENT_MADE_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : 'Appointment made successfully.',
    type          : 'APPOINTMENT_MADE_SUCCESSFULLY'
  },
  BOOKING_CANCELLED_SUCCESSFULLY : {
    statusCode    : 200,
    customMessage : "Booking cancelled successfully",
    type          : 'BOOKING_CANCELLED_SUCCESSFULLY'
  },
  OUT_FOR_SERVICE : {
    statusCode    : 200,
    customMessage : 'Out for service.',
    type          : 'OUT_FOR_SERVICE'
  },
  DEFAULT : {
    statusCode    : 200,
    customMessage : 'Success',
    type          : 'DEFAULT'
  },
  MEMBERSHIP_SUBSCRIBED : {
    statusCode    : 200,
    customMessage : 'Membership Subscribed Successfully.',
    type          : 'MEMBERSHIP_SUBSCRIBED'
  },
  MEMBERSHIP_END : {
    statusCode    : 200,
    customMessage : 'Membership ended successfully.',
    type          : 'MEMBERSHIP_END'
  },
  SET_AVAILABILITY : {
    statusCode    : 200,
    customMessage : 'Thanks, your availability has now been updated.',
    type          : 'SET_AVAILABILITY'
  },
  LOGGED_IN : {
    statusCode    : 200,
    customMessage : 'Logged In Successfully.',
    type          : 'LOGGED_IN'
  },
  LOGGED_OUT : {
    statusCode    : 200,
    customMessage : 'Logged Out Successfully.',
    type          : 'LOGGED_OUT'
  },
  USER_SAVED : {
    statusCode    : 200,
    customMessage : 'User Saved Successfully.',
    type          : 'USER_SAVED'
  },
  PROMO_CODE_CREATED : {
    statusCode    : 201,
    customMessage : 'Promo code created successfully.',
    type          : "PROMO_CODE_CREATED"
  },
  PROMO_CODE_APPLIED : {
    statusCode    : 200,
    customMessage : 'Promotion code applied successfully.',
    type          : 'PROMO_CODE_APPLIED'
  },
  LOGOUT : {
    statusCode    : 200,
    customMessage : 'Logged out successfully.',
    type          : 'LOGOUT'
  },
  NEW_PASSWORD_LINK_SENT : {
    statusCode    : 200,
    customMessage : 'Password reset link has been sent to your registered email.',
    type          : 'NEW_PASSWORD_LINK_SENT'
  },
  WEB_TOKEN_ADD : {
    statusCode    : 200,
    customMessage : 'Web Token added successfully',
    type          : 'NEW_TOKEN_ADDED'
  },
  WEB_TOKEN_DELETE : {
    statusCode    : 200,
    customMessage : 'Web Token deleted successfully',
    type          : 'TOKEN_DELETED'
  },
  RESELLER_BUSINESS_INFO : {
    status        : 200,
    customMessage : 'Reseller Business info fetched',
    type          : 'RESELLER_BUSINESS_INFO'
  },
  RESELLER_BUSINESS_INFO_UPDATED : {
    status        : 200,
    customMessage : 'Reseller Business info updated',
    type          : 'RESELLER_BUSINESS_INFO_UPDATED'
  },
  RESELLER_INFO_UPDATED : {
    statusCode    : 200,
    customMessage : 'Reseller info updated successfully',
    type          : 'RESELLER_INFO_UPDATED'
  },
  RESELLER_DISABLED : {
    statusCode    : 200,
    customMessage : 'Reseller disabled successfully',
    type          : 'RESELLER_DISABLED'
  },
  RESELLER_CREATED : {
    statusCode    : 200,
    customMessage : 'Reseller created successfully',
    type          : 'RESELLER_CREATED'
  },
  MESSAGE_RECEIVED : {
    status        : 200,
    customMessage : 'Message received by server',
    type          : 'MESSAGE_RECEIVED'
  },
};

exports.swaggerDefaultResponseMessages = [
  { code : 200, message : 'OK' },
  { code : 201, message : 'CREATED' },
  { code : 400, message : 'Bad Request' },
  { code : 401, message : 'Unauthorized' },
  { code : 403, message : 'Forbidden' },
  { code : 404, message : 'Data Not Found' },
  { code : 500, message : 'Something went wrong, try again' }
];
