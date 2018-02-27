-- MySQL dump 10.13  Distrib 5.7.20, for Linux (x86_64)
--
-- Host: 172.31.16.220    Database: fugu_bot_prod
-- ------------------------------------------------------
-- Server version	5.7.20-log

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agent_invitations`
--

DROP TABLE IF EXISTS `agent_invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `agent_invitations` (
  `agent_id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `email_id` varchar(100) COLLATE utf8mb4_bin NOT NULL,
  `email_token` varchar(100) COLLATE utf8mb4_bin NOT NULL,
  `user_sub_type` int(11) DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `is_user_created` tinyint(1) DEFAULT '0',
  `is_invitation` tinyint(1) DEFAULT '1',
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`agent_id`),
  KEY `email_id` (`email_id`),
  KEY `email_token` (`email_token`),
  KEY `business_id` (`business_id`),
  KEY `business_id_2` (`business_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1227 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `alerted_admins`
--

DROP TABLE IF EXISTS `alerted_admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alerted_admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `alert_id` int(11) NOT NULL,
  `completed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `business_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `alert_id` (`alert_id`,`business_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `alerted_agents`
--

DROP TABLE IF EXISTS `alerted_agents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alerted_agents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `alert_id` int(11) NOT NULL,
  `agent_id` int(11) NOT NULL,
  `completed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `alert_id` (`alert_id`,`agent_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alerts` (
  `alert_id` int(11) NOT NULL AUTO_INCREMENT,
  `alert_content` varchar(255) NOT NULL,
  `description` text NOT NULL COMMENT 'Description of Alert',
  `priority` int(11) NOT NULL,
  `type` tinyint(4) NOT NULL COMMENT '1. Agent 2. Admin 3. All',
  `alert_color` varchar(40) NOT NULL,
  `identifier` varchar(255) DEFAULT NULL COMMENT 'to identify which alert is to trigger',
  `is_enabled` tinyint(4) NOT NULL,
  `mandatory` tinyint(4) NOT NULL COMMENT '0 For Non Mandatory 1 is mandatory',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`alert_id`),
  UNIQUE KEY `identifierIndex` (`identifier`),
  UNIQUE KEY `identifier` (`identifier`),
  UNIQUE KEY `identifier_2` (`identifier`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `analytics_cron_schedule`
--

DROP TABLE IF EXISTS `analytics_cron_schedule`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `analytics_cron_schedule` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `run_start` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'start time of cron',
  `run_end` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'end time of cron',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3548 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `analytics_users_conversation`
--

DROP TABLE IF EXISTS `analytics_users_conversation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `analytics_users_conversation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `message_id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL DEFAULT '0',
  `user_id` int(11) NOT NULL DEFAULT '0',
  `channel_id` int(11) DEFAULT '0',
  `message` text COLLATE utf8mb4_bin,
  `user_type` tinyint(4) DEFAULT NULL COMMENT '1-User, 2-Agent',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `label_id` int(11) DEFAULT '-1',
  `message_type` tinyint(11) DEFAULT '1',
  `row_created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `row_updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `channel_id` (`channel_id`),
  KEY `message_type` (`message_type`),
  KEY `user_id` (`user_id`),
  KEY `user_type` (`user_type`),
  KEY `created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=513891 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `app_version`
--

DROP TABLE IF EXISTS `app_version`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `app_version` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `latest_version` int(11) NOT NULL,
  `critical_version` int(11) NOT NULL,
  `download_link` text NOT NULL,
  `device_type` enum('ANDROID','IOS') NOT NULL,
  `fugu_app_type` enum('AGENT') NOT NULL,
  `text` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `billing_plans`
--

DROP TABLE IF EXISTS `billing_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing_plans` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `per_agent_cost` float(65,2) NOT NULL,
  `selected_agent_count` int(11) NOT NULL,
  `current_month_quota` int(11) NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `business_id` (`business_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `billing_properties`
--

DROP TABLE IF EXISTS `billing_properties`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing_properties` (
  `business_id` int(10) NOT NULL,
  `property` varchar(100) COLLATE utf8mb4_bin NOT NULL,
  `value` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`business_id`,`property`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `billing_transactions`
--

DROP TABLE IF EXISTS `billing_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing_transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `invoice_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `business_id` int(11) NOT NULL,
  `amount` float(65,2) NOT NULL,
  `invoice` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `transaction_id` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `transaction_status` tinyint(1) DEFAULT NULL,
  `transaction_type` enum('BASEPLAN','P2P','MANUAL','AGENT_COUNT_INCREASED') COLLATE utf8mb4_bin NOT NULL,
  `transaction_name` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `comment` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  KEY `invoice_id` (`invoice_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `billing_trials`
--

DROP TABLE IF EXISTS `billing_trials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `billing_trials` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `expiry_date` timestamp NULL DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `business_id` (`business_id`)
) ENGINE=InnoDB AUTO_INCREMENT=859 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `business_activity`
--

DROP TABLE IF EXISTS `business_activity`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_activity` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `activity` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `business_id` (`business_id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `business_canned_messages`
--

DROP TABLE IF EXISTS `business_canned_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_canned_messages` (
  `id` int(10) NOT NULL AUTO_INCREMENT,
  `business_id` int(10) NOT NULL,
  `title` varchar(100) NOT NULL,
  `message` varchar(1000) NOT NULL DEFAULT '',
  `sku` varchar(100) NOT NULL COMMENT 'trigger sets it id if null is passed trigger : trigger_bcm_sku ',
  `is_enabled` tinyint(8) NOT NULL DEFAULT '1' COMMENT 'trigger sets it to id on disable : trigger_bcm_is_enabled ',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `title_key` (`business_id`,`title`),
  UNIQUE KEY `sku_key` (`business_id`,`sku`)
) ENGINE=InnoDB AUTO_INCREMENT=586 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `business_details`
--

DROP TABLE IF EXISTS `business_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_details` (
  `business_id` int(10) NOT NULL AUTO_INCREMENT,
  `business_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `app_secret_key` varchar(255) NOT NULL,
  `address` varchar(255) NOT NULL DEFAULT '',
  `city` char(20) NOT NULL DEFAULT '',
  `pincode` varchar(10) NOT NULL DEFAULT '  ',
  `contact_number` varchar(32) NOT NULL DEFAULT '',
  `email` varchar(60) NOT NULL,
  `contact_person` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `business_image` varchar(255) DEFAULT NULL,
  `reseller_id` int(11) DEFAULT NULL COMMENT 'id of reseller who created the business',
  `reseller_reference_id` int(11) DEFAULT NULL COMMENT 'reference id of the reseller',
  `enabled` tinyint(4) NOT NULL DEFAULT '1',
  `int_bus` enum('OUT','INS') NOT NULL DEFAULT 'OUT' COMMENT 'outside or inside business',
  `custom_notification` tinyint(4) NOT NULL DEFAULT '0',
  `white_label` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`business_id`),
  UNIQUE KEY `app_secret_key_2` (`app_secret_key`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=1465 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `business_device_mappings`
--

DROP TABLE IF EXISTS `business_device_mappings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_device_mappings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `app_type` int(11) NOT NULL,
  `app_name` varchar(1023) NOT NULL,
  `api_key` varchar(1023) DEFAULT NULL,
  `certificate` varchar(1023) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `topic` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_index` (`business_id`,`app_type`),
  UNIQUE KEY `app_name` (`app_name`,`business_id`)
) ENGINE=InnoDB AUTO_INCREMENT=396 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `business_property`
--

DROP TABLE IF EXISTS `business_property`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `business_property` (
  `business_id` int(10) NOT NULL COMMENT ' ',
  `property` varchar(100) NOT NULL,
  `value` varchar(255) DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`business_id`,`property`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `channel_history`
--

DROP TABLE IF EXISTS `channel_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `channel_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `channel_id` int(11) NOT NULL,
  `last_read_message_id` int(11) NOT NULL DEFAULT '0',
  `last_message_read_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_channel` (`user_id`,`channel_id`),
  KEY `last_read_message_id` (`last_read_message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3417299 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `channels`
--

DROP TABLE IF EXISTS `channels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `channels` (
  `channel_id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL DEFAULT '0',
  `channel_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT ' 1- Open, 2-Closed',
  `channel_type` tinyint(4) DEFAULT '1' COMMENT '1-End User, 2-Support',
  `source` enum('DEFAULT','SDK','AGENT_APP','WEB','WIDGET','INTEGRATION','OUTREACH') NOT NULL DEFAULT 'DEFAULT',
  `source_type` int(11) NOT NULL DEFAULT '0',
  `lmu_id` int(11) DEFAULT NULL COMMENT 'LAST MESSAGE FOR USER ID',
  `lma_id` int(11) DEFAULT NULL COMMENT 'LAST MESSAGE FOR AGENT ID',
  `lm_updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'LAST MESSAGE UPDATED AT ',
  `owner_id` int(11) NOT NULL DEFAULT '0' COMMENT 'USER ID WHO CREATED CHANNEL',
  `agent_id` int(11) DEFAULT NULL COMMENT 'ASSIGNED AGENT ID',
  `initiated_by_agent` tinyint(4) NOT NULL DEFAULT '0',
  `chat_type` int(11) DEFAULT '0' COMMENT '0 default, 1 peer-peer',
  `transaction_id` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `default_message` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT ' ',
  `custom_label` varchar(255) CHARACTER SET latin1 COLLATE latin1_general_ci DEFAULT NULL,
  `custom_attributes` json DEFAULT NULL COMMENT 'to add custom attributes',
  `label_id` int(11) NOT NULL DEFAULT '-1',
  `label` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `channel_image` varchar(255) DEFAULT '',
  `channel_priority` int(11) DEFAULT '0',
  PRIMARY KEY (`channel_id`),
  KEY `channel_type` (`channel_type`),
  KEY `business_id` (`business_id`),
  KEY `status` (`status`),
  KEY `lmu_id` (`lmu_id`),
  KEY `lma_id` (`lma_id`),
  KEY `lm_updated_at` (`lm_updated_at`),
  KEY `owner_id` (`owner_id`),
  KEY `agent_id` (`agent_id`),
  KEY `transaction_id_index` (`transaction_id`),
  KEY `channel_type_business_status_idx` (`channel_type`,`business_id`,`status`),
  KEY `custom_label` (`custom_label`)
) ENGINE=InnoDB AUTO_INCREMENT=617509 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `it_channel_users`
--

DROP TABLE IF EXISTS `it_channel_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `it_channel_users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `channel_id` int(11) NOT NULL,
  `it_uid` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `channel_details` json DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `it_uid` (`it_uid`),
  KEY `channel_id` (`channel_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `it_integration_details`
--

DROP TABLE IF EXISTS `it_integration_details`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `it_integration_details` (
  `integration_id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `auth_details` json NOT NULL,
  `source_type` int(11) NOT NULL,
  `enable` tinyint(1) DEFAULT '1',
  `created` datetime DEFAULT CURRENT_TIMESTAMP,
  `udpated` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`integration_id`),
  KEY `business_id` (`business_id`),
  KEY `source_type` (`source_type`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `it_users`
--

DROP TABLE IF EXISTS `it_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `it_users` (
  `it_uid` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `it_user_id` varchar(255) COLLATE utf8mb4_bin NOT NULL,
  `fugu_user_id` int(11) NOT NULL,
  `source_type` int(11) NOT NULL,
  `integration_id` int(11) NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`it_uid`),
  UNIQUE KEY `unique_business_user` (`business_id`,`it_user_id`),
  KEY `it_user_id` (`it_user_id`),
  KEY `fugu_user_id` (`fugu_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `it_webhook_history`
--

DROP TABLE IF EXISTS `it_webhook_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `it_webhook_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) DEFAULT NULL,
  `channel_id` int(11) DEFAULT NULL,
  `source_type` int(11) NOT NULL,
  `data` json NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `log_exception`
--

DROP TABLE IF EXISTS `log_exception`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `log_exception` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `device_details` json NOT NULL,
  `device_type` int(11) NOT NULL,
  `error` json NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=600750 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `logs_user_online_status`
--

DROP TABLE IF EXISTS `logs_user_online_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `logs_user_online_status` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `online_status` enum('AVAILABLE','AWAY','OFFLINE') COLLATE utf8mb4_bin NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00' ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=42665 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `message_history`
--

DROP TABLE IF EXISTS `message_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `message_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `channel_id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '1-Active, 0-Blocked, 2-Archived',
  `user_type` tinyint(4) DEFAULT NULL COMMENT '1-User, 2-Agent',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `sent_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `delivered_at` timestamp NULL DEFAULT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `channel_id` (`channel_id`),
  KEY `status` (`status`),
  KEY `user_type` (`user_type`),
  KEY `message_id` (`message_id`),
  KEY `user_id` (`user_id`),
  KEY `channel_id_status_user_id` (`channel_id`,`status`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=9042165 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `meta_connect`
--

DROP TABLE IF EXISTS `meta_connect`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meta_connect` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(10) NOT NULL COMMENT '1 android , 2 ios , 3 web',
  `device_type` int(10) NOT NULL,
  `source` int(10) NOT NULL COMMENT '1 SDK, 2 agent app, 3 web and 4 widget',
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `created` (`created`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `meta_handshake`
--

DROP TABLE IF EXISTS `meta_handshake`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `meta_handshake` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(10) NOT NULL COMMENT '1 android , 2 ios , 3 web',
  `device_type` int(10) NOT NULL,
  `source` int(10) NOT NULL COMMENT '1 SDK, 2 agent app, 3 web and 4 widget',
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `or_campaigns`
--

DROP TABLE IF EXISTS `or_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `or_campaigns` (
  `campaign_id` int(11) NOT NULL AUTO_INCREMENT,
  `segment_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `business_id` int(11) NOT NULL,
  `push_type` tinyint(1) NOT NULL,
  `campaign_type` tinyint(1) NOT NULL,
  `device_type` tinyint(1) DEFAULT NULL,
  `campaign_name` varchar(128) NOT NULL,
  `subject_text` varchar(128) NOT NULL,
  `message_text` varchar(8096) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`campaign_id`),
  UNIQUE KEY `campaign_name` (`campaign_name`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `or_segments`
--

DROP TABLE IF EXISTS `or_segments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `or_segments` (
  `segment_id` int(11) unsigned NOT NULL AUTO_INCREMENT,
  `segment_name` varchar(128) NOT NULL DEFAULT '',
  `user_rules` json NOT NULL,
  `business_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `total_result` int(11) NOT NULL DEFAULT '0',
  `is_visitor` int(11) NOT NULL DEFAULT '0',
  `is_deleted` int(11) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`segment_id`),
  UNIQUE KEY `segment_name` (`segment_name`)
) ENGINE=InnoDB AUTO_INCREMENT=148 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `push_logs`
--

DROP TABLE IF EXISTS `push_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `push_logs` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `channel_id` int(11) NOT NULL,
  `message_id` int(11) NOT NULL,
  `skipped` mediumtext COLLATE utf8mb4_bin,
  `ios_failed` mediumtext COLLATE utf8mb4_bin,
  `ios_success` mediumtext COLLATE utf8mb4_bin,
  `android_failed` mediumtext COLLATE utf8mb4_bin,
  `android_success` mediumtext COLLATE utf8mb4_bin,
  PRIMARY KEY (`id`),
  UNIQUE KEY `channel_message` (`channel_id`,`message_id`)
) ENGINE=InnoDB AUTO_INCREMENT=774036 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `query_builder`
--

DROP TABLE IF EXISTS `query_builder`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `query_builder` (
  `table_name` varchar(128) NOT NULL,
  `column_name` varchar(128) NOT NULL,
  `label` varchar(128) NOT NULL,
  `type` varchar(128) NOT NULL,
  `input` varchar(128) NOT NULL DEFAULT 'text',
  `values` varchar(128) DEFAULT NULL COMMENT 'comma separated for multiple valeus',
  `values_labels` varchar(256) DEFAULT NULL,
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `request_emails`
--

DROP TABLE IF EXISTS `request_emails`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `request_emails` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL DEFAULT '',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `name` varchar(255) DEFAULT NULL,
  `contact_no` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=1635 DEFAULT CHARSET=utf8;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `reseller_info`
--

DROP TABLE IF EXISTS `reseller_info`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `reseller_info` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(248) NOT NULL,
  `email` varchar(40) NOT NULL,
  `phone_no` varchar(15) NOT NULL,
  `reseller_token` varchar(124) NOT NULL,
  `api_key` varchar(124) DEFAULT NULL COMMENT 'for android',
  `certificate` varchar(124) DEFAULT NULL COMMENT 'for ios',
  `topic` varchar(64) DEFAULT NULL COMMENT 'iOs topic',
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '0 - DISABLED, 1-ENABLED',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `super_admin`
--

DROP TABLE IF EXISTS `super_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `super_admin` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(80) COLLATE utf8mb4_bin NOT NULL,
  `password` varchar(100) COLLATE utf8mb4_bin NOT NULL,
  `access_token` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `access_token_expiry_datetime` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tagged_users`
--

DROP TABLE IF EXISTS `tagged_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tagged_users` (
  `tagged_id` int(11) NOT NULL AUTO_INCREMENT,
  `channel_id` int(11) NOT NULL,
  `tagged_user_id` int(11) NOT NULL,
  `tagger_id` int(11) NOT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tagged_id`),
  UNIQUE KEY `unique_tag` (`channel_id`,`tagged_user_id`,`tagger_id`),
  KEY `tagged_user_id` (`tagged_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=518 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags` (
  `tag_id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `tag_name` varchar(255) NOT NULL,
  `color_code` varchar(20) DEFAULT '#FF5733',
  `is_enabled` tinyint(4) NOT NULL DEFAULT '1',
  `status` tinyint(4) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`tag_id`),
  KEY `business_id` (`business_id`),
  KEY `tag_name` (`tag_name`)
) ENGINE=InnoDB AUTO_INCREMENT=6234 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags_to_channel`
--

DROP TABLE IF EXISTS `tags_to_channel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags_to_channel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL,
  `tag_id` int(11) NOT NULL,
  `channel_id` int(11) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '0-In Active, 1- Active, 2-Blocked',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `tag_channel` (`tag_id`,`channel_id`),
  KEY `tag_id` (`tag_id`),
  KEY `channel_id` (`channel_id`)
) ENGINE=InnoDB AUTO_INCREMENT=630188 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `tags_to_user`
--

DROP TABLE IF EXISTS `tags_to_user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `tags_to_user` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tag_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '1',
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_key` (`tag_id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_devices`
--

DROP TABLE IF EXISTS `user_devices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_devices` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `device_details` json NOT NULL,
  `business_id` varchar(255) NOT NULL DEFAULT '0',
  `device_id` varchar(255) DEFAULT '0',
  `token` varchar(255) DEFAULT NULL,
  `token_updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `device_type` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_info` (`user_id`,`device_id`),
  UNIQUE KEY `unique_user_token` (`user_id`,`device_type`,`token`) USING BTREE,
  KEY `user_id` (`user_id`),
  KEY `business_id` (`business_id`),
  KEY `device_type` (`device_type`),
  KEY `device_id_index` (`device_id`)
) ENGINE=InnoDB AUTO_INCREMENT=2001793 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_devices_backup`
--

DROP TABLE IF EXISTS `user_devices_backup`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_devices_backup` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `device_details` json NOT NULL,
  `business_id` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `device_type` tinyint(4) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_info` (`user_id`,`business_id`,`device_type`),
  KEY `user_id` (`user_id`),
  KEY `business_id` (`business_id`),
  KEY `device_type` (`device_type`)
) ENGINE=InnoDB AUTO_INCREMENT=1798957 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_migration_history`
--

DROP TABLE IF EXISTS `user_migration_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_migration_history` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_name` varchar(255) DEFAULT NULL,
  `email` varchar(40) DEFAULT NULL,
  `device_type` tinyint(4) DEFAULT NULL,
  `device_id` varchar(255) DEFAULT NULL,
  `device_key` varchar(20) NOT NULL DEFAULT '' COMMENT 'server generated key ',
  `user_id` int(11) NOT NULL COMMENT 'anonymous user id whose data is migrated in migrated user id',
  `migrated_user_id` int(11) NOT NULL COMMENT ' logged in user id in which data is migrated',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`,`migrated_user_id`),
  KEY `user_id_index` (`user_id`) USING BTREE,
  KEY `user_id_2` (`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=12892 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `user_to_channel`
--

DROP TABLE IF EXISTS `user_to_channel`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `user_to_channel` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) NOT NULL,
  `channel_id` int(11) NOT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '0-In Active, 1-Active, 2-Blocked',
  `last_activity` timestamp NULL DEFAULT NULL,
  `notification` enum('MUTED','UNMUTED') CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL DEFAULT 'UNMUTED',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `channel_type` int(11) NOT NULL DEFAULT '1',
  `channel_status` int(11) NOT NULL DEFAULT '1',
  `on_subscribe` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_channel` (`user_id`,`channel_id`) USING BTREE,
  KEY `channel_type` (`channel_type`),
  KEY `user_id` (`user_id`),
  KEY `channel_id` (`channel_id`)
) ENGINE=InnoDB AUTO_INCREMENT=962877 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users` (
  `user_id` int(11) NOT NULL AUTO_INCREMENT,
  `auth_user_id` int(11) DEFAULT NULL,
  `business_id` int(11) NOT NULL,
  `email` varchar(60) NOT NULL DEFAULT '  ',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'anonymous user on fire',
  `user_name` varchar(255) DEFAULT NULL,
  `status` tinyint(4) NOT NULL DEFAULT '0' COMMENT '0-Active, 1-Blocked, 2-Deleted',
  `online_status` enum('AVAILABLE','AWAY','OFFLINE') NOT NULL DEFAULT 'OFFLINE' COMMENT 'to identify agent online offline',
  `online_status_updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'To Record last seen of user',
  `source` enum('DEFAULT','SDK','AGENT_APP','WEB','WIDGET','INTEGRATION','OUTREACH') DEFAULT 'DEFAULT',
  `source_type` int(11) NOT NULL DEFAULT '0',
  `user_properties` json DEFAULT NULL,
  `notification_level` enum('ALL_CHATS','DIRECT_MESSAGES','NONE') NOT NULL DEFAULT 'ALL_CHATS',
  `user_type` tinyint(4) DEFAULT NULL COMMENT '1-End User, 2-Agent',
  `phone_number` varchar(255) NOT NULL DEFAULT '   ',
  `client_id` varchar(255) DEFAULT '0',
  `user_image` varchar(255) DEFAULT '',
  `password` varchar(100) DEFAULT NULL,
  `access_token` varchar(100) DEFAULT NULL,
  `device_type` tinyint(4) DEFAULT NULL COMMENT '1-for Android, 2-for IOS',
  `app_type` int(11) DEFAULT '1',
  `device_id` varchar(255) DEFAULT '0',
  `device_key` varchar(20) NOT NULL DEFAULT '' COMMENT 'server generated key ',
  `user_unique_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT '0',
  `user_sub_type` int(11) DEFAULT NULL COMMENT '1 to 10 - reserved for users, 11 to 20-reserved for agents',
  `attributes` json DEFAULT NULL,
  `custom_attributes` json DEFAULT NULL COMMENT 'to add custom attributes',
  `device_token` varchar(255) DEFAULT NULL,
  `web_token` varchar(256) DEFAULT NULL,
  `web_token_updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`user_id`),
  KEY `user_type` (`user_type`),
  KEY `user_unique_key` (`user_unique_key`),
  KEY `access_token` (`access_token`),
  KEY `business_id` (`business_id`),
  KEY `device_id` (`device_id`),
  KEY `email` (`email`),
  KEY `phone_number` (`phone_number`),
  KEY `device_key` (`device_key`),
  KEY `fullname` (`full_name`(15)),
  KEY `auth_user_id` (`auth_user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=1949929 DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `users_conversation`
--

DROP TABLE IF EXISTS `users_conversation`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `users_conversation` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `business_id` int(11) NOT NULL DEFAULT '0',
  `user_id` int(11) NOT NULL DEFAULT '0',
  `channel_id` int(11) DEFAULT '0',
  `channel_name` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `user_name` varchar(255) COLLATE utf8mb4_bin DEFAULT NULL,
  `message` text COLLATE utf8mb4_bin,
  `status` tinyint(4) NOT NULL DEFAULT '1' COMMENT '1-Active, 0-Blocked, 2-Archived',
  `user_type` tinyint(4) DEFAULT NULL COMMENT '1-User, 2-Agent',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `label_id` int(11) DEFAULT '-1',
  `message_type` tinyint(11) DEFAULT '1' COMMENT '1- Normal, 2-Action',
  PRIMARY KEY (`id`),
  KEY `channel_id` (`channel_id`),
  KEY `message_type` (`message_type`),
  KEY `user_id` (`user_id`),
  KEY `user_type` (`user_type`),
  KEY `created_at` (`created_at`),
  KEY `id_user_id_idx` (`id`,`user_id`)
) ENGINE=InnoDB AUTO_INCREMENT=369859132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-02-27 12:44:29
