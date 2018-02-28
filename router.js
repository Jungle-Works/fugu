
const express                  = require('express');
const multer                   = require('multer');

const router                   = express.Router();// { caseSensitive: true }
const routehandler             = require('./Routes/routehandler');
const validator                = require('./Routes/validator');
const access                   = require('./Routes/accessLevel');

const uploader                 = multer({ dest : './uploads/' });
const preTasks                 = require('./Routes/preTasks');


// TODO :
// source in all apis
// app version

router.post('/users/userlogout',                    validator.userLogout, access.barrier(access.lvl.EMPTY), routehandler.userLogout);
router.post('/users/getUsers',                      validator.getUsers, access.barrier(access.lvl.AGENT_ADMIN),    routehandler.getUsers);
router.post('/users/getUserDetails',                validator.getUserDetails, access.barrier(access.lvl.AGENT_ADMIN), routehandler.getUserDetails);
router.post('/users/putUserDetails',                validator.putUserDetails, access.barrier(access.lvl.EMPTY), routehandler.putUserDetails);
router.post('/users/editUserDetails',               validator.editUserDetailsValidation, access.barrier(access.lvl.AGENT_ADMIN), routehandler.editUserDetails);
router.post('/users/editInfo',                      uploader.any(), validator.editUserInfo, access.barrier(access.lvl.USER), routehandler.editUserInfo);
router.post('/users/getInfo',                       validator.getUserInfo, access.barrier(access.lvl.USER), routehandler.getUserInfo);
router.post('/users/getUserChannelsInfo',           validator.getUserChannelsInfo, access.barrier(access.lvl.USER), routehandler.getUserChannelsInfo);
router.post('/users/getUserChannelInfo',            validator.getUserChannelInfo, access.barrier(access.lvl.USER), routehandler.getUserChannelInfo);
router.post('/users/getUserMessageStats',           validator.getUserMessageStats, access.barrier(access.lvl.EMPTY), routehandler.getUserMessageStats);
router.post('/users/testPushNotification',          validator.testPushNotification, access.barrier(access.lvl.USER), routehandler.testPushNotification);


router.post('/channel/getChannels',                 validator.getChannels, access.barrier(access.lvl.AGENT_ADMIN), routehandler.getChannels);
router.post('/channel/editChannelPriority',         validator.editChannelPriority, access.barrier(access.lvl.ADMIN), routehandler.editChannelPriority);
router.post('/channel/createChannelsV2',            uploader.any(),  validator.createChannelsV2, access.barrier(access.lvl.ADMIN), routehandler.createChannelsV2);
router.post('/channel/editChannelsV2',              uploader.any(),  validator.editChannelsV2, access.barrier(access.lvl.ADMIN), routehandler.editChannelsV2);
router.post('/channel/channelEnableDisable',        validator.channelEnableDisable, access.barrier(access.lvl.ADMIN), routehandler.channelEnableDisable);
router.post('/channel/editInfo',                    uploader.any(),  validator.editInfo, access.barrier(access.lvl.USER), routehandler.editInfo);

/*  user_id channel_id business_id agent_email invited_agent_id */
router.post('/agent/agentLogin',                    validator.agentLoginValidation, validator.checkAppVersion, access.barrier(access.lvl.EMPTY), routehandler.agentLogin);
router.post('/agent/agentLogout',                   validator.agentLogoutValidation, access.barrier(access.lvl.AGENT_ADMIN), routehandler.agentLogout);
router.post('/agent/getAgents',                     validator.getAgents, access.barrier(access.lvl.AGENT_ADMIN), routehandler.getAgents);
router.post('/agent/editInfo',                      uploader.any(), validator.editAgent, access.barrier(access.lvl.AGENT_ADMIN), routehandler.editAgent);
router.post('/agent/getInfo',                       validator.getAgentInfo, access.barrier(access.lvl.AGENT_ADMIN), routehandler.getAgentInfo);
router.post('/agent/agentEnableDisable',            validator.agentEnableDisableValidation, access.barrier(access.lvl.AGENT_ADMIN), routehandler.agentEnableDisable);
router.post('/agent/assignAgent',                   validator.assignAgent, access.barrier(access.lvl.AGENT_ADMIN), routehandler.assignAgent);
router.post('/agent/v1/assignAgent',                validator.assignAgentV1, access.barrier(access.lvl.AGENT_ADMIN), routehandler.assignAgentV1);
router.post('/agent/inviteAgent',                   validator.inviteAgent, access.barrier(access.lvl.ADMIN), routehandler.inviteAgent);
router.post('/agent/resendInvitation',              validator.resendInvitation, access.barrier(access.lvl.ADMIN), routehandler.resendInvitation);
router.post('/agent/revokeInvitation',              validator.revokeInvitation, access.barrier(access.lvl.ADMIN), routehandler.revokeInvitation);
router.get('/agent/verifyToken',                    validator.verifyToken, access.barrier(access.lvl.EMPTY), routehandler.verifyToken);
router.get('/agent/otpLogin',                       validator.otpLogin, access.barrier(access.lvl.EMPTY), routehandler.otpLogin);
router.post('/agent/registerAgent',                 uploader.any(), validator.registerAgent, access.barrier(access.lvl.EMPTY), routehandler.registerAgent);
router.post('/agent/resetPasswordRequest',          validator.resetPasswordRequest, access.barrier(access.lvl.EMPTY), routehandler.resetPasswordRequest);
router.post('/agent/resetPassword',                 validator.resetPassword, access.barrier(access.lvl.EMPTY), routehandler.resetPassword);
router.post('/agent/changePassword',                validator.changePassword, access.barrier(access.lvl.AGENT_ADMIN), routehandler.changePassword);
router.post('/agent/adminResetPasswordRequest',     validator.adminResetPasswordRequest, access.barrier(access.lvl.ADMIN), routehandler.adminResetPasswordRequest);
router.post('/agent/agentLoginViaAuthToken',        validator.agentLoginViaAuthTokenValidation, access.barrier(access.lvl.EMPTY), routehandler.agentLoginViaAuthToken);



/*  channel_id user_id and user must be involved */
router.post('/conversation/createConversation',     validator.createConversation, access.barrier(access.lvl.EMPTY), preTasks.initiallizeWidget, routehandler.createConversation);
router.post('/conversation/getConversations',       validator.getConversations,  access.barrier(access.lvl.ANYONE), routehandler.getConversations);
router.post('/conversation/v1/getConversations',    validator.getConversationsV1, validator.checkAppVersion, access.barrier(access.lvl.ANYONE), routehandler.getConversationsV1);
router.post('/conversation/search',                 validator.conversationSearch, access.barrier(access.lvl.AGENT_ADMIN), routehandler.searchUser);
router.post('/conversation/getMessages',            validator.getMessages, access.barrier(access.lvl.ANYONE), routehandler.getMessages);
router.post('/conversation/uploadFile',             uploader.any(),  validator.uploadFileValidation, access.barrier(access.lvl.EMPTY), routehandler.uploadFile);
router.post('/conversation/getByLabelId',           validator.getByLabelId, access.barrier(access.lvl.USER), routehandler.getByLabelId);
router.post('/conversation/markConversation',       validator.markConversation, access.barrier(access.lvl.AGENT_ADMIN), routehandler.markConversation);
router.post('/conversation/v1/markConversation',    validator.markConversationV1, access.barrier(access.lvl.AGENT_ADMIN), routehandler.markConversationV1);
router.post('/conversation/thirdPartyPublish',      validator.thirdPartyPublish, routehandler.thirdPartyPublish);



// creategroupchat (with custom group name)
// leave group chat
router.post('/chat/groupChatSearch',                validator.groupChatSearch, access.barrier(access.lvl.USER), routehandler.groupChatSearch);
router.post('/chat/getChatGroups',                  validator.getChatGroups, access.barrier(access.lvl.USER), routehandler.getChatGroups);
router.post('/chat/createGroupChat',                validator.createGroupChat, access.barrier(access.lvl.USER), routehandler.createGroupChat);
router.post('/chat/createOneToOneChat',             validator.createO2OChat, access.barrier(access.lvl.USER), routehandler.createO2OChat);
router.post('/chat/getMembers',                     validator.getChatMembers, access.barrier(access.lvl.ANYONE), routehandler.getChatMembers);
router.post('/chat/addMember',                      validator.addChatMember, access.barrier(access.lvl.ANYONE), routehandler.addChatMember);
router.post('/chat/removeMember',                   validator.removeChatMember, access.barrier(access.lvl.ANYONE), routehandler.removeChatMember);
router.post('/chat/join',                           validator.joinChat, access.barrier(access.lvl.USER), routehandler.joinChat);
router.post('/chat/leave',                          validator.leaveChat, access.barrier(access.lvl.USER), routehandler.leaveChat);



router.post('/tags/createTags',                     validator.createTags, access.barrier(access.lvl.AGENT_ADMIN), routehandler.createTags);
router.post('/tags/getTags',                        validator.getTags, access.barrier(access.lvl.AGENT_ADMIN), routehandler.getTags);
router.post('/tags/editTags',                       validator.editTags, access.barrier(access.lvl.AGENT_ADMIN), routehandler.editTags);
router.post('/tags/getChannelTags',                 validator.getChannelTags, access.barrier(access.lvl.AGENT_ADMIN), routehandler.getChannelTags);
router.post('/tags/assignTagsToChannel',            validator.assignTagsToChannel, access.barrier(access.lvl.AGENT_ADMIN), routehandler.assignTagsToChannel);
router.post('/tags/enableDisableTag',               validator.enableDisableTag, access.barrier(access.lvl.AGENT_ADMIN), routehandler.enableDisableTag);



router.post('/business/getConfiguration',           validator.getBusinessConfiguration, access.barrier(access.lvl.EMPTY), routehandler.getBusinessConfiguration);
router.post('/business/editConfiguration',          validator.editBusinessConfiguration, access.barrier(access.lvl.ADMIN), routehandler.editBusinessConfiguration);
router.post('/business/getDevices',                 validator.getDevices, access.barrier(access.lvl.ADMIN), routehandler.getDevices);
router.post('/business/addDevice',                  validator.addDevice, access.barrier(access.lvl.ADMIN), routehandler.addDevice);
router.post('/business/editDevice',                 uploader.any(),  validator.editDevice, access.barrier(access.lvl.ADMIN), routehandler.editDevice);
router.post('/business/addCannedMessages',          validator.addBusinessCannedMessages, access.barrier(access.lvl.AGENT_ADMIN), routehandler.addBusinessCannedMessages);
router.post('/business/getCannedMessages',          validator.getBusinessCannedMessages, access.barrier(access.lvl.AGENT_ADMIN), routehandler.getBusinessCannedMessages);
router.post('/business/editCannedMessages',         validator.editBusinessCannedMessages, access.barrier(access.lvl.AGENT_ADMIN), routehandler.editBusinessCannedMessages);
router.post('/business/signUp',                     validator.signUpValidation, access.barrier(access.lvl.EMPTY), routehandler.signUp);
router.post('/business/getInfo',                    validator.getBusinessInfo, access.barrier(access.lvl.ADMIN), routehandler.getBusinessInfo);
router.post('/business/editInfo',                   uploader.any(),  validator.editBusinessInfo, access.barrier(access.lvl.ADMIN), routehandler.editBusinessInfo);
router.post('/business/getBusinessStats',           validator.getBusinessStats, access.barrier(access.lvl.SUPERADMIN), routehandler.getBusinessStats);
router.post('/business/getAllBusinessStats',        validator.getAllBusinessStats, access.barrier(access.lvl.SUPERADMIN), routehandler.getAllBusinessStats);
router.post('/business/editBusinessStats',          validator.editBusinessStats, access.barrier(access.lvl.SUPERADMIN), routehandler.editBusinessStats);



router.post('/email/entryEmail',                    validator.entryEmail, access.barrier(access.lvl.EMPTY), routehandler.entryEmail);
router.post('/email/entryEmail',                    validator.entryEmail, access.barrier(access.lvl.EMPTY), routehandler.entryEmail);
router.post('/server/heapdump',                     validator.heapDump, access.barrier(access.lvl.EMPTY), routehandler.heapDump);
router.post('/server/logEdit',                      validator.logEdit, access.barrier(access.lvl.EMPTY), routehandler.logEdit);
router.post('/server/logException',                 validator.logException, access.barrier(access.lvl.EMPTY), routehandler.logException);
router.post('/server/handleMessage',                validator.handleMessage, access.barrier(access.lvl.EMPTY), routehandler.handleMessage);
router.post('/server/handleMessageWithFaye',        validator.handleMessageWithFaye, access.barrier(access.lvl.EMPTY), routehandler.handleMessageWithFaye);
router.post('/server/handlePush',                   validator.handlePush, access.barrier(access.lvl.EMPTY), routehandler.handlePush);
router.post('/server/cacheReload',                  validator.cacheReload, access.barrier(access.lvl.EMPTY), routehandler.cacheReload);



router.post('/reseller/putUserDetails',             validator.resellerPutUserDetails, access.barrier(access.lvl.EMPTY), routehandler.resellerPutUserDetails);
router.post('/reseller/getBusinessInfo',            validator.resellerBusinessInfo, access.barrier(access.lvl.EMPTY), routehandler.resellerBusinessInfo);
router.post('/reseller/activateBusiness',           validator.activateBusiness, access.barrier(access.lvl.EMPTY), routehandler.activateBusiness);
router.post('/reseller/deactivateBusiness',         validator.deactivateBusiness, access.barrier(access.lvl.EMPTY), routehandler.deactivateBusiness);
router.post('/reseller/addOrUpdateConfig',          validator.addOrUpdateConfig, access.barrier(access.lvl.EMPTY), routehandler.addOrUpdateConfig);
router.post('/reseller/assignReseller',             validator.assignReseller, access.barrier(access.lvl.SUPERADMIN), routehandler.assignReseller);
router.post('/reseller/create',                     validator.createReseller, access.barrier(access.lvl.SUPERADMIN), routehandler.resellerCreate);
router.post('/reseller/update',                     uploader.any(), validator.updateReseller, access.barrier(access.lvl.EMPTY), routehandler.resellerUpdate);
router.post('/reseller/disable',                    validator.disableReseller, access.barrier(access.lvl.SUPERADMIN), routehandler.resellerDisable);
router.post('/reseller/getInfo',                    validator.resellerInfo, access.barrier(access.lvl.SUPERADMIN), routehandler.resellerInfo);



router.post('/alert/createAlert',                   validator.createAlert, access.barrier(access.lvl.SUPERADMIN), routehandler.createAlert);
router.post('/alert/updateAlert',                   validator.updateAlert, access.barrier(access.lvl.SUPERADMIN), routehandler.updateAlert);
router.post('/alert/getAlert',                      validator.getAlert, access.barrier(access.lvl.AGENT_ADMIN), routehandler.getAlert);
router.post('/alert/closeAlert',                    validator.closeAlert, access.barrier(access.lvl.AGENT_ADMIN), routehandler.closeAlert);
router.post('/alert/getAllAlerts',                  validator.getAllAlerts, access.barrier(access.lvl.SUPERADMIN), routehandler.getAllAlerts);
router.post('/alert/editAlertPriority',             validator.editAlertPriority, access.barrier(access.lvl.SUPERADMIN), routehandler.editAlertPriority);



router.post('/fugu/putUserDetails',                 validator.fuguPutUserDetails, access.barrier(access.lvl.EMPTY), routehandler.fuguPutUserDetails);
router.post('/fugu/sendMessage',                    validator.sendMessage, access.barrier(access.lvl.EMPTY), routehandler.sendMessage);
router.post('/fugu/sendMessageFromAgent',           validator.sendMessageFromAgent, access.barrier(access.lvl.EMPTY), routehandler.sendMessageFromAgent);
router.post('/fugu/createConversation',             validator.fuguCreateConversation, access.barrier(access.lvl.EMPTY), routehandler.fuguCreateConversation);
router.post('/fugu/sendServerMessage',              validator.sendServerMessage, access.barrier(access.lvl.EMPTY), routehandler.sendServerMessage);
router.post('/fugu/thirdPartyPublish',              validator.thirdPartyPublish, access.barrier(access.lvl.EMPTY), routehandler.thirdPartyPublish);
router.patch('/fugu/editUserInfo',                   validator.editFuguUserInfo, access.barrier(access.lvl.EMPTY), routehandler.editFuguUserInfo);
router.post('/fuguExternal/createConversation',     validator.fuguExternalCreateConversation, access.barrier(access.lvl.EMPTY), routehandler.fuguExternalCreateConversation);




router.post('/billing/getProperties',               validator.getBillingProperties, access.barrier(access.lvl.BUSINESS_OWNER), routehandler.getBillingProperties);
router.post('/billing/startAgentPlan',              validator.startAgentPlan, access.barrier(access.lvl.BUSINESS_OWNER), routehandler.startAgentPlan);
router.post('/billing/getBillingPlans',             validator.getBillingPlans, access.barrier(access.lvl.BUSINESS_OWNER), routehandler.getBillingPlans);
router.post('/billing/getCard',                     validator.getCard, access.barrier(access.lvl.BUSINESS_OWNER), routehandler.getCard);
router.post('/billing/addCard',                     validator.addCard, access.barrier(access.lvl.BUSINESS_OWNER), routehandler.addCard);
router.post('/billing/editAgentPlan',               validator.editAgentPlan, access.barrier(access.lvl.BUSINESS_OWNER), routehandler.editAgentPlan);
router.post('/billing/getTransactions',             validator.getTransactions, access.barrier(access.lvl.BUSINESS_OWNER), routehandler.getTransactions);

router.post('/billing/deductPayment',               validator.deductPayment, access.barrier(access.lvl.SUPERADMIN), routehandler.deductPayment);
router.post('/billing/runBilling',                  validator.runBilling, access.barrier(access.lvl.SUPERADMIN), routehandler.runBilling);
router.post('/billing/runDayEndTask',               validator.runDayEndTask, access.barrier(access.lvl.SUPERADMIN), routehandler.runDayEndTask);
router.post('/billing/getAllTransactions',          validator.getAllTransactions, access.barrier(access.lvl.SUPERADMIN), routehandler.getAllTransactions);



router.post('/superAdmin/login',                    validator.superAdminLoginValidation, routehandler.superAdminLogin);

module.exports = router;
