-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Хост: 127.0.0.1
-- Время создания: Май 27 2026 г., 22:20
-- Версия сервера: 10.4.32-MariaDB
-- Версия PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- База данных: `mcsr_hub`
--

-- --------------------------------------------------------

--
-- Структура таблицы `api_cache`
--

CREATE TABLE `api_cache` (
  `id` varchar(50) NOT NULL,
  `data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`data`)),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Структура таблицы `matches`
--

CREATE TABLE `matches` (
  `id` int(11) NOT NULL,
  `tournament_id` int(11) DEFAULT NULL,
  `player1_name` varchar(100) NOT NULL,
  `player2_name` varchar(100) NOT NULL,
  `score1` int(11) DEFAULT 0,
  `score2` int(11) DEFAULT 0,
  `match_date` datetime DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `video_url` varchar(512) DEFAULT NULL,
  `match_title` varchar(255) DEFAULT '1/16 финала',
  `format` varchar(50) DEFAULT 'Best of 3',
  `version` varchar(50) DEFAULT '1.16.1',
  `category` varchar(100) DEFAULT 'Any% RSG',
  `seed1` varchar(255) DEFAULT NULL,
  `seed2` varchar(255) DEFAULT NULL,
  `seed3` varchar(255) DEFAULT NULL,
  `player1_rank` int(11) DEFAULT NULL,
  `player1_best_time` varchar(20) DEFAULT NULL,
  `player1_win_rate` varchar(10) DEFAULT NULL,
  `player1_total_runs` int(11) DEFAULT NULL,
  `player2_rank` int(11) DEFAULT NULL,
  `player2_best_time` varchar(20) DEFAULT NULL,
  `player2_win_rate` varchar(10) DEFAULT NULL,
  `player2_total_runs` int(11) DEFAULT NULL,
  `seed4` varchar(255) DEFAULT NULL,
  `seed5` varchar(255) DEFAULT NULL,
  `seed6` varchar(255) DEFAULT NULL,
  `seed7` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `matches`
--

INSERT INTO `matches` (`id`, `tournament_id`, `player1_name`, `player2_name`, `score1`, `score2`, `match_date`, `status`, `video_url`, `match_title`, `format`, `version`, `category`, `seed1`, `seed2`, `seed3`, `player1_rank`, `player1_best_time`, `player1_win_rate`, `player1_total_runs`, `player2_rank`, `player2_best_time`, `player2_win_rate`, `player2_total_runs`, `seed4`, `seed5`, `seed6`, `seed7`) VALUES
(9, 7, 'Infume', 'Feinberg', 1, 0, '2026-05-06 15:31:00', 'scheduled', '', '1/16 финала', '1', '1.16.1', 'Any% RSG', 'Пустынная Пирамида', NULL, NULL, 6, 'N/A', '100%', 54, 2, 'N/A', '100%', 62, NULL, NULL, NULL, NULL),
(11, 7, 'doogile', 'edcr', 1, 1, '2026-05-06 17:14:00', 'scheduled', 'https://www.twitch.tv/doogile', '1/16 финала', '3', '1.16.1', 'Any% RSG', 'Захоронённое Сокровище', 'Деревня', 'Деревня', 13, '426575', '67%', 70, 1, '353371', '78%', 237, NULL, NULL, NULL, NULL),
(12, 7, 'Pinne', 'nhb_', 3, 3, '2026-05-07 18:42:00', 'scheduled', '', '1/16 финала', '7', '1.16.1', 'Any% RSG', 'Деревня', 'Затонувший корабль', 'Пустынная Пирамида', 28, '403492', '58%', 59, 17, '363758', '59%', 180, 'Захоронённое Сокровище', 'Деревня', 'Разрушенный Портал', 'Пустынная Пирамида'),
(15, 9, 'BeefSalad', 'BadGamer', 0, 1, '2026-04-29 18:42:00', 'scheduled', 'https://www.twitch.tv/mcsrranked', '1/16 Финала', '1', '1.16.1', 'Any% RSG', 'Затонувший корабль', 'Пустынная Пирамида', NULL, 34, '448011', '55%', 133, 9, '442075', '65%', 52, NULL, NULL, NULL, NULL);

-- --------------------------------------------------------

--
-- Структура таблицы `picks`
--

CREATE TABLE `picks` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `tournament_id` int(11) NOT NULL,
  `match_id` int(11) NOT NULL,
  `predicted_winner_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Структура таблицы `tournaments`
--

CREATE TABLE `tournaments` (
  `id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `title` varchar(255) NOT NULL,
  `status` enum('upcoming','ongoing','finished') DEFAULT 'upcoming',
  `image_url` varchar(512) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `prize_pool` varchar(255) DEFAULT 'TBA',
  `player_count` int(11) DEFAULT 0,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `tournaments`
--

INSERT INTO `tournaments` (`id`, `created_at`, `title`, `status`, `image_url`, `description`, `prize_pool`, `player_count`, `start_date`, `end_date`) VALUES
(7, '2026-05-05 08:31:02', 'MCSR Relay', 'upcoming', '', 'Relay Tournament', '10000$', 32, '2026-05-06 15:30:00', '2026-05-08 15:30:00'),
(9, '2026-05-05 11:56:52', 'Nether Regions', 'ongoing', '', 'Nether Regions', '13370$', 32, '2026-05-05 18:42:00', '2026-05-07 18:56:00');

-- --------------------------------------------------------

--
-- Структура таблицы `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `points` int(11) DEFAULT 1000,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `flag` varchar(50) DEFAULT 'un'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Дамп данных таблицы `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password`, `points`, `created_at`, `flag`) VALUES
(6, 'Saymon', 'kostyanaumencko@yandex.ru', '$2b$10$9JTvQdfko6d4cMSksoXDfutojAZLrtPMxk/S.jSrqM8bYzXzhfO5O', 1000, '2026-05-27 15:17:36', 'az'),
(8, 'saymonoob', 'kostyanaumencko1@yandex.ru', '$2b$10$j/g7hgx.AGWOf0TH0I.UseF4V.UpZ1QkCZw9q5PRDSNM5s0El4mCm', 1000, '2026-05-27 15:19:41', 'au');

--
-- Индексы сохранённых таблиц
--

--
-- Индексы таблицы `api_cache`
--
ALTER TABLE `api_cache`
  ADD PRIMARY KEY (`id`);

--
-- Индексы таблицы `matches`
--
ALTER TABLE `matches`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tournament_id` (`tournament_id`);

--
-- Индексы таблицы `picks`
--
ALTER TABLE `picks`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_prediction` (`user_id`,`tournament_id`,`match_id`);

--
-- Индексы таблицы `tournaments`
--
ALTER TABLE `tournaments`
  ADD PRIMARY KEY (`id`);

--
-- Индексы таблицы `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`),
  ADD UNIQUE KEY `email` (`email`);

--
-- AUTO_INCREMENT для сохранённых таблиц
--

--
-- AUTO_INCREMENT для таблицы `matches`
--
ALTER TABLE `matches`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT для таблицы `picks`
--
ALTER TABLE `picks`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=118;

--
-- AUTO_INCREMENT для таблицы `tournaments`
--
ALTER TABLE `tournaments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT для таблицы `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- Ограничения внешнего ключа сохраненных таблиц
--

--
-- Ограничения внешнего ключа таблицы `matches`
--
ALTER TABLE `matches`
  ADD CONSTRAINT `matches_ibfk_1` FOREIGN KEY (`tournament_id`) REFERENCES `tournaments` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
