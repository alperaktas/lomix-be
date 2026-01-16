--
-- PostgreSQL database dump
--

\restrict mniOHxUXt1gMeM8E764bbxyzNng1eVoKgDbprd4IXBIgXYiw0TYTR4xe3eZ9I3t

-- Dumped from database version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-0ubuntu0.24.04.1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_endpoints; Type: TABLE; Schema: public; Owner: lomix
--

CREATE TABLE public.api_endpoints (
    id integer NOT NULL,
    category character varying(255) NOT NULL,
    method character varying(10) NOT NULL,
    path character varying(255) NOT NULL,
    description text,
    request_sample text,
    response_sample text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.api_endpoints OWNER TO lomix;

--
-- Name: api_endpoints_id_seq; Type: SEQUENCE; Schema: public; Owner: lomix
--

CREATE SEQUENCE public.api_endpoints_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.api_endpoints_id_seq OWNER TO lomix;

--
-- Name: api_endpoints_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lomix
--

ALTER SEQUENCE public.api_endpoints_id_seq OWNED BY public.api_endpoints.id;


--
-- Name: groups; Type: TABLE; Schema: public; Owner: lomix
--

CREATE TABLE public.groups (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.groups OWNER TO lomix;

--
-- Name: groups_id_seq; Type: SEQUENCE; Schema: public; Owner: lomix
--

CREATE SEQUENCE public.groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.groups_id_seq OWNER TO lomix;

--
-- Name: groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lomix
--

ALTER SEQUENCE public.groups_id_seq OWNED BY public.groups.id;


--
-- Name: logs; Type: TABLE; Schema: public; Owner: lomix
--

CREATE TABLE public.logs (
    id integer NOT NULL,
    level character varying(255) NOT NULL,
    message text NOT NULL,
    meta text,
    "createdAt" timestamp with time zone
);


ALTER TABLE public.logs OWNER TO lomix;

--
-- Name: logs_id_seq; Type: SEQUENCE; Schema: public; Owner: lomix
--

CREATE SEQUENCE public.logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logs_id_seq OWNER TO lomix;

--
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lomix
--

ALTER SEQUENCE public.logs_id_seq OWNED BY public.logs.id;


--
-- Name: menus; Type: TABLE; Schema: public; Owner: lomix
--

CREATE TABLE public.menus (
    id integer NOT NULL,
    title character varying(255) NOT NULL,
    url character varying(255),
    icon character varying(255),
    parent_id integer,
    "order" integer DEFAULT 0,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public.menus OWNER TO lomix;

--
-- Name: menus_id_seq; Type: SEQUENCE; Schema: public; Owner: lomix
--

CREATE SEQUENCE public.menus_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.menus_id_seq OWNER TO lomix;

--
-- Name: menus_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lomix
--

ALTER SEQUENCE public.menus_id_seq OWNED BY public.menus.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: lomix
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.roles OWNER TO lomix;

--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: lomix
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.roles_id_seq OWNER TO lomix;

--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lomix
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: user_groups; Type: TABLE; Schema: public; Owner: lomix
--

CREATE TABLE public.user_groups (
    id integer NOT NULL,
    user_id integer NOT NULL,
    group_id integer NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.user_groups OWNER TO lomix;

--
-- Name: user_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: lomix
--

CREATE SEQUENCE public.user_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_groups_id_seq OWNER TO lomix;

--
-- Name: user_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lomix
--

ALTER SEQUENCE public.user_groups_id_seq OWNED BY public.user_groups.id;


--
-- Name: user_logs; Type: TABLE; Schema: public; Owner: lomix
--

CREATE TABLE public.user_logs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    action character varying(255) NOT NULL,
    ip_address character varying(255),
    user_agent character varying(255),
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL
);


ALTER TABLE public.user_logs OWNER TO lomix;

--
-- Name: user_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: lomix
--

CREATE SEQUENCE public.user_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_logs_id_seq OWNER TO lomix;

--
-- Name: user_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lomix
--

ALTER SEQUENCE public.user_logs_id_seq OWNED BY public.user_logs.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: lomix
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(255) DEFAULT 'user'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    gender character varying(255),
    ip_address character varying(255),
    user_agent character varying(255),
    device_model character varying(255),
    avatar character varying(255),
    phone character varying(255),
    status character varying(255) DEFAULT 'pending'::character varying,
    verification_code character varying(255),
    reset_password_code character varying(255),
    reset_password_expires timestamp with time zone
);


ALTER TABLE public.users OWNER TO lomix;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: lomix
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO lomix;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: lomix
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: api_endpoints id; Type: DEFAULT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.api_endpoints ALTER COLUMN id SET DEFAULT nextval('public.api_endpoints_id_seq'::regclass);


--
-- Name: groups id; Type: DEFAULT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups ALTER COLUMN id SET DEFAULT nextval('public.groups_id_seq'::regclass);


--
-- Name: logs id; Type: DEFAULT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.logs ALTER COLUMN id SET DEFAULT nextval('public.logs_id_seq'::regclass);


--
-- Name: menus id; Type: DEFAULT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.menus ALTER COLUMN id SET DEFAULT nextval('public.menus_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: user_groups id; Type: DEFAULT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.user_groups ALTER COLUMN id SET DEFAULT nextval('public.user_groups_id_seq'::regclass);


--
-- Name: user_logs id; Type: DEFAULT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.user_logs ALTER COLUMN id SET DEFAULT nextval('public.user_logs_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: api_endpoints; Type: TABLE DATA; Schema: public; Owner: lomix
--

COPY public.api_endpoints (id, category, method, path, description, request_sample, response_sample, created_at, updated_at) FROM stdin;
1	Auth	POST	/api/login	Kullanıcı girişi yapar ve token döner.	{"email": "admin@lomix.com", "password": "123"}	{"token": "...", "user": {...}}	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
2	Auth	POST	/api/logout	Kullanıcı çıkışı yapar ve log kaydı atar.	{}	{"message": "Çıkış işlemi kaydedildi."}	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
3	Users	GET	/api/users	Tüm kullanıcıları listeler (Sayfalama ve arama destekler).	{}	[{"id": 1, "username": "admin", ...}]	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
4	Users	POST	/api/users	Yeni kullanıcı oluşturur.	{"username": "test", "email": "test@test.com", "password": "123", "role": "user"}	{"id": 2, ...}	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
5	Users	PUT	/api/users/:id	Kullanıcı bilgilerini günceller.	{"username": "newname"}	{"message": "Kullanıcı güncellendi"}	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
6	Users	DELETE	/api/users/:id	Kullanıcıyı siler.	{}	{"message": "Kullanıcı silindi"}	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
7	Users	GET	/api/users/stats	Kullanıcı istatistiklerini döner.	{}	{"totalUsers": 10, "roles": [...], "groups": [...]}	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
8	Users	GET	/api/users/logs	Kullanıcı loglarını listeler.	{}	{"totalItems": 50, "logs": [...]}	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
9	Roles	GET	/api/roles	Tüm rolleri listeler.	{}	[{"id": 1, "name": "admin", ...}]	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
10	Roles	POST	/api/roles	Yeni rol oluşturur.	{"name": "editor"}	{"id": 3, "name": "editor"}	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
11	Roles	DELETE	/api/roles/:id	Rolü siler (Kullanıcısı yoksa).	{}	{"message": "Rol silindi"}	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
12	Groups	GET	/api/groups	Tüm grupları listeler.	{}	[{"id": 1, "name": "Yazılım Ekibi", ...}]	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
13	Groups	POST	/api/groups	Yeni grup oluşturur.	{"name": "İK", "description": "İnsan Kaynakları"}	\N	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
14	Groups	GET	/api/groups/:id/members	Gruba ait üyeleri listeler.	{}	[{"id": 1, "username": "admin", ...}]	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
15	Menus	GET	/api/menus	Menü ağacını döner.	{}	[{"id": 1, "title": "Dashboard", "children": []}]	2026-01-03 21:14:11.906+00	2026-01-03 21:14:11.906+00
16	Mobile	POST	/api/mobile/auth/register	Mobil uygulamadan yeni kullanıcı kaydı oluşturur.	{"username": "mobiluser", "email": "mobil@test.com", "password": "123", "gender": "male", "deviceModel": "iPhone 13", "phone": "5551234567"}	{"message": "Kayıt başarılı...", "userId": 5, "status": "pending"}	2026-01-03 22:25:46.194+00	2026-01-03 22:25:46.194+00
17	Mobile	POST	/api/mobile/auth/verify	Kullanıcı doğrulama kodunu kontrol eder ve hesabı aktif eder.	{"email": "mobil@test.com", "code": "1234"}	{"message": "Hesap başarıyla doğrulandı ve aktif edildi."}	2026-01-03 22:25:46.212+00	2026-01-03 22:25:46.212+00
18	Mobile	POST	/api/mobile/auth/forgot-password	Şifre sıfırlama kodu gönderir.	{"email": "mobil@test.com"}	{"message": "Şifre sıfırlama kodu e-posta adresinize gönderildi."}	2026-01-03 22:34:57.032+00	2026-01-03 22:34:57.032+00
19	Mobile	POST	/api/mobile/auth/reset-password	Şifreyi sıfırlar.	{"email": "mobil@test.com", "code": "1234", "newPassword": "newPass123"}	\N	2026-01-03 22:34:57.047+00	2026-01-03 22:34:57.047+00
20	Mobile	POST	/api/mobile/auth/login	Mobil uygulama girişi yapar ve token döner.	{"email": "mobil@test.com", "password": "123", "deviceInfo": "iPhone 13"}	{"message": "Giriş başarılı.", "token": "...", "user": {"id": 1, "username": "mobiluser", "email": "mobil@test.com", "role": "user", "avatar": null}}	2026-01-04 14:36:37.577+00	2026-01-04 14:36:37.577+00
21	Mobile	POST	/api/mobile/auth/logout	Mobil uygulamadan çıkış yapar (Log kaydı oluşturur).	{"deviceInfo": "iPhone 13"}	{"message": "Başarıyla çıkış yapıldı."}	2026-01-04 16:17:43.085+00	2026-01-04 16:17:43.085+00
\.


--
-- Data for Name: groups; Type: TABLE DATA; Schema: public; Owner: lomix
--

COPY public.groups (id, name, description, created_at, updated_at) FROM stdin;
1	admin		2026-01-03 19:30:34.719+00	2026-01-03 19:30:34.719+00
2	işletmen		2026-01-03 19:40:13.73+00	2026-01-03 19:40:13.73+00
\.


--
-- Data for Name: logs; Type: TABLE DATA; Schema: public; Owner: lomix
--

COPY public.logs (id, level, message, meta, "createdAt") FROM stdin;
1	info	Mobil Giriş: olcay.ergun@gmail.com	{"userId":9,"ip":"::ffff:88.230.80.19","device":"windows"}	2026-01-04 15:00:18.134+00
\.


--
-- Data for Name: menus; Type: TABLE DATA; Schema: public; Owner: lomix
--

COPY public.menus (id, title, url, icon, parent_id, "order", "createdAt", "updatedAt") FROM stdin;
1	Dashboard	/dashboard	fa-tachometer-alt	\N	1	2026-01-03 10:34:27.823+00	2026-01-03 10:34:27.823+00
5	Ayarlar	/settings	fa-cogs	\N	3	2026-01-03 10:43:46.444+00	2026-01-03 10:43:46.444+00
6	Menü Yönetimi	/settings/menus	fa-list	5	1	2026-01-03 10:43:46.45+00	2026-01-03 18:27:43.279+00
7	Gruplar	/users/group	fa-layer-group	2	3	2026-01-03 19:30:01.86031+00	2026-01-03 19:30:01.86031+00
8	Loglar	/users/logs	fa-history	2	4	2026-01-03 20:49:07.742178+00	2026-01-03 20:49:07.742178+00
9	API Endpointleri	/settings/apis	fa-code	5	2	2026-01-03 21:18:14.999188+00	2026-01-03 21:18:14.999188+00
2	Kullanıcı İşlemleri	#	fa-users	\N	2	2026-01-03 10:43:46.424+00	2026-01-03 10:43:46.424+00
3	Kullanıcılar	/users/user	\N	2	1	2026-01-03 10:43:46.436+00	2026-01-03 16:42:53.114+00
4	Roller	/users/role	\N	2	2	2026-01-03 10:43:46.439+00	2026-01-03 16:42:53.114+00
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: lomix
--

COPY public.roles (id, name, created_at, updated_at) FROM stdin;
2	normal	2026-01-03 16:57:04.195+00	2026-01-03 16:57:04.195+00
3	müşteri	2026-01-03 16:57:04.195+00	2026-01-03 16:57:04.195+00
8	admin	2026-01-03 17:53:31.165+00	2026-01-03 17:53:31.165+00
\.


--
-- Data for Name: user_groups; Type: TABLE DATA; Schema: public; Owner: lomix
--

COPY public.user_groups (id, user_id, group_id, created_at, updated_at) FROM stdin;
1	1	1	2026-01-03 19:53:01.078+00	2026-01-03 19:53:01.078+00
2	1	2	2026-01-03 19:53:13.956+00	2026-01-03 19:53:13.956+00
3	2	2	2026-01-03 20:01:16.847+00	2026-01-03 20:01:16.847+00
\.


--
-- Data for Name: user_logs; Type: TABLE DATA; Schema: public; Owner: lomix
--

COPY public.user_logs (id, user_id, action, ip_address, user_agent, created_at, updated_at) FROM stdin;
1	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-03 20:49:26.257+00	2026-01-03 20:49:26.257+00
2	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-03 20:57:19.796+00	2026-01-03 20:57:19.796+00
3	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-03 21:00:30.175+00	2026-01-03 21:00:30.175+00
4	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-03 21:02:16.557+00	2026-01-03 21:02:16.557+00
5	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-03 21:03:39.903+00	2026-01-03 21:03:39.903+00
6	1	LOGOUT	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-03 21:03:44.226+00	2026-01-03 21:03:44.226+00
7	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-03 21:04:03.188+00	2026-01-03 21:04:03.188+00
8	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 07:02:24.874+00	2026-01-04 07:02:24.874+00
9	1	LOGOUT	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 07:05:28.22+00	2026-01-04 07:05:28.22+00
10	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 07:05:29.554+00	2026-01-04 07:05:29.554+00
11	1	LOGOUT	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 07:10:54.597+00	2026-01-04 07:10:54.597+00
12	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 07:10:55.915+00	2026-01-04 07:10:55.915+00
13	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 07:29:20.803+00	2026-01-04 07:29:20.803+00
14	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 07:45:46.391+00	2026-01-04 07:45:46.391+00
15	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 07:50:43.897+00	2026-01-04 07:50:43.897+00
16	9	LOGIN_MOBILE	::ffff:88.230.80.19	windows	2026-01-04 15:00:18.119+00	2026-01-04 15:00:18.119+00
17	1	LOGIN	::ffff:46.106.64.38	Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36	2026-01-04 15:22:33.768+00	2026-01-04 15:22:33.768+00
18	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 15:49:23.622+00	2026-01-04 15:49:23.622+00
19	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 15:49:34.854+00	2026-01-04 15:49:34.854+00
20	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 16:14:41.77+00	2026-01-04 16:14:41.77+00
21	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 16:28:53.226+00	2026-01-04 16:28:53.226+00
22	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 16:29:04.016+00	2026-01-04 16:29:04.016+00
23	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 16:30:21.28+00	2026-01-04 16:30:21.28+00
24	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 17:12:41.958+00	2026-01-04 17:12:41.958+00
25	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 17:15:59.106+00	2026-01-04 17:15:59.106+00
26	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 18:30:53.047+00	2026-01-04 18:30:53.047+00
27	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 18:45:51.335+00	2026-01-04 18:45:51.335+00
28	1	LOGIN	::ffff:88.230.80.19	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:146.0) Gecko/20100101 Firefox/146.0	2026-01-04 18:46:46.255+00	2026-01-04 18:46:46.255+00
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: lomix
--

COPY public.users (id, username, password, email, role, created_at, updated_at, gender, ip_address, user_agent, device_model, avatar, phone, status, verification_code, reset_password_code, reset_password_expires) FROM stdin;
2	test	$2b$10$ZENEk3ExEJctE5Nn8Q6qK.T1FKJodUbjuP0AueTqKHR26HMEEehCG	test@hotmail.com	normal	2026-01-03 17:58:41.200543+00	2026-01-03 19:43:47.273469+00	\N	\N	\N	\N	\N	\N	pending	\N	\N	\N
9	olcaye	$2b$10$/zvVBneewwoktWA0BOiGdew7FVfTkPnwdrP98rNdLh0ikjixqw.sa	olcay.ergun@gmail.com	user	2026-01-04 12:00:50.094079+00	2026-01-04 12:01:19.699822+00	male	::ffff:88.230.80.19	Dart/3.10 (dart:io)	windows	\N	5551234567	active	\N	\N	\N
1	admin	$2b$10$Cs8TWxqvlD8L3/3VEmbfnO9dY8s6tmYXVC1W5N7.gFdDUtpp2L8YC	admin@lomix.com	admin	2026-01-03 17:21:25.454269+00	2026-01-04 18:36:21.459371+00	\N	\N	\N	\N	/uploads/avatar-1767551781400.jpg		active	\N	\N	\N
\.


--
-- Name: api_endpoints_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lomix
--

SELECT pg_catalog.setval('public.api_endpoints_id_seq', 21, true);


--
-- Name: groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lomix
--

SELECT pg_catalog.setval('public.groups_id_seq', 2, true);


--
-- Name: logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lomix
--

SELECT pg_catalog.setval('public.logs_id_seq', 1, true);


--
-- Name: menus_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lomix
--

SELECT pg_catalog.setval('public.menus_id_seq', 10, true);


--
-- Name: roles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lomix
--

SELECT pg_catalog.setval('public.roles_id_seq', 8, true);


--
-- Name: user_groups_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lomix
--

SELECT pg_catalog.setval('public.user_groups_id_seq', 3, true);


--
-- Name: user_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lomix
--

SELECT pg_catalog.setval('public.user_logs_id_seq', 28, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: lomix
--

SELECT pg_catalog.setval('public.users_id_seq', 9, true);


--
-- Name: api_endpoints api_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.api_endpoints
    ADD CONSTRAINT api_endpoints_pkey PRIMARY KEY (id);


--
-- Name: groups groups_name_key; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key UNIQUE (name);


--
-- Name: groups groups_name_key1; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key1 UNIQUE (name);


--
-- Name: groups groups_name_key10; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key10 UNIQUE (name);


--
-- Name: groups groups_name_key11; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key11 UNIQUE (name);


--
-- Name: groups groups_name_key12; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key12 UNIQUE (name);


--
-- Name: groups groups_name_key13; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key13 UNIQUE (name);


--
-- Name: groups groups_name_key14; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key14 UNIQUE (name);


--
-- Name: groups groups_name_key15; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key15 UNIQUE (name);


--
-- Name: groups groups_name_key16; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key16 UNIQUE (name);


--
-- Name: groups groups_name_key17; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key17 UNIQUE (name);


--
-- Name: groups groups_name_key18; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key18 UNIQUE (name);


--
-- Name: groups groups_name_key19; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key19 UNIQUE (name);


--
-- Name: groups groups_name_key2; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key2 UNIQUE (name);


--
-- Name: groups groups_name_key20; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key20 UNIQUE (name);


--
-- Name: groups groups_name_key21; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key21 UNIQUE (name);


--
-- Name: groups groups_name_key22; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key22 UNIQUE (name);


--
-- Name: groups groups_name_key23; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key23 UNIQUE (name);


--
-- Name: groups groups_name_key24; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key24 UNIQUE (name);


--
-- Name: groups groups_name_key25; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key25 UNIQUE (name);


--
-- Name: groups groups_name_key26; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key26 UNIQUE (name);


--
-- Name: groups groups_name_key27; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key27 UNIQUE (name);


--
-- Name: groups groups_name_key28; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key28 UNIQUE (name);


--
-- Name: groups groups_name_key29; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key29 UNIQUE (name);


--
-- Name: groups groups_name_key3; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key3 UNIQUE (name);


--
-- Name: groups groups_name_key30; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key30 UNIQUE (name);


--
-- Name: groups groups_name_key31; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key31 UNIQUE (name);


--
-- Name: groups groups_name_key32; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key32 UNIQUE (name);


--
-- Name: groups groups_name_key33; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key33 UNIQUE (name);


--
-- Name: groups groups_name_key34; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key34 UNIQUE (name);


--
-- Name: groups groups_name_key35; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key35 UNIQUE (name);


--
-- Name: groups groups_name_key36; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key36 UNIQUE (name);


--
-- Name: groups groups_name_key37; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key37 UNIQUE (name);


--
-- Name: groups groups_name_key38; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key38 UNIQUE (name);


--
-- Name: groups groups_name_key39; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key39 UNIQUE (name);


--
-- Name: groups groups_name_key4; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key4 UNIQUE (name);


--
-- Name: groups groups_name_key40; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key40 UNIQUE (name);


--
-- Name: groups groups_name_key41; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key41 UNIQUE (name);


--
-- Name: groups groups_name_key42; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key42 UNIQUE (name);


--
-- Name: groups groups_name_key43; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key43 UNIQUE (name);


--
-- Name: groups groups_name_key44; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key44 UNIQUE (name);


--
-- Name: groups groups_name_key45; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key45 UNIQUE (name);


--
-- Name: groups groups_name_key46; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key46 UNIQUE (name);


--
-- Name: groups groups_name_key47; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key47 UNIQUE (name);


--
-- Name: groups groups_name_key48; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key48 UNIQUE (name);


--
-- Name: groups groups_name_key49; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key49 UNIQUE (name);


--
-- Name: groups groups_name_key5; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key5 UNIQUE (name);


--
-- Name: groups groups_name_key50; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key50 UNIQUE (name);


--
-- Name: groups groups_name_key51; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key51 UNIQUE (name);


--
-- Name: groups groups_name_key52; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key52 UNIQUE (name);


--
-- Name: groups groups_name_key53; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key53 UNIQUE (name);


--
-- Name: groups groups_name_key54; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key54 UNIQUE (name);


--
-- Name: groups groups_name_key55; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key55 UNIQUE (name);


--
-- Name: groups groups_name_key56; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key56 UNIQUE (name);


--
-- Name: groups groups_name_key57; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key57 UNIQUE (name);


--
-- Name: groups groups_name_key6; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key6 UNIQUE (name);


--
-- Name: groups groups_name_key7; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key7 UNIQUE (name);


--
-- Name: groups groups_name_key8; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key8 UNIQUE (name);


--
-- Name: groups groups_name_key9; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_name_key9 UNIQUE (name);


--
-- Name: groups groups_pkey; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.groups
    ADD CONSTRAINT groups_pkey PRIMARY KEY (id);


--
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- Name: menus menus_pkey; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.menus
    ADD CONSTRAINT menus_pkey PRIMARY KEY (id);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_name_key1; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key1 UNIQUE (name);


--
-- Name: roles roles_name_key10; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key10 UNIQUE (name);


--
-- Name: roles roles_name_key100; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key100 UNIQUE (name);


--
-- Name: roles roles_name_key101; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key101 UNIQUE (name);


--
-- Name: roles roles_name_key102; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key102 UNIQUE (name);


--
-- Name: roles roles_name_key103; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key103 UNIQUE (name);


--
-- Name: roles roles_name_key11; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key11 UNIQUE (name);


--
-- Name: roles roles_name_key12; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key12 UNIQUE (name);


--
-- Name: roles roles_name_key13; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key13 UNIQUE (name);


--
-- Name: roles roles_name_key14; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key14 UNIQUE (name);


--
-- Name: roles roles_name_key15; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key15 UNIQUE (name);


--
-- Name: roles roles_name_key16; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key16 UNIQUE (name);


--
-- Name: roles roles_name_key17; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key17 UNIQUE (name);


--
-- Name: roles roles_name_key18; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key18 UNIQUE (name);


--
-- Name: roles roles_name_key19; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key19 UNIQUE (name);


--
-- Name: roles roles_name_key2; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key2 UNIQUE (name);


--
-- Name: roles roles_name_key20; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key20 UNIQUE (name);


--
-- Name: roles roles_name_key21; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key21 UNIQUE (name);


--
-- Name: roles roles_name_key22; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key22 UNIQUE (name);


--
-- Name: roles roles_name_key23; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key23 UNIQUE (name);


--
-- Name: roles roles_name_key24; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key24 UNIQUE (name);


--
-- Name: roles roles_name_key25; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key25 UNIQUE (name);


--
-- Name: roles roles_name_key26; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key26 UNIQUE (name);


--
-- Name: roles roles_name_key27; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key27 UNIQUE (name);


--
-- Name: roles roles_name_key28; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key28 UNIQUE (name);


--
-- Name: roles roles_name_key29; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key29 UNIQUE (name);


--
-- Name: roles roles_name_key3; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key3 UNIQUE (name);


--
-- Name: roles roles_name_key30; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key30 UNIQUE (name);


--
-- Name: roles roles_name_key31; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key31 UNIQUE (name);


--
-- Name: roles roles_name_key32; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key32 UNIQUE (name);


--
-- Name: roles roles_name_key33; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key33 UNIQUE (name);


--
-- Name: roles roles_name_key34; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key34 UNIQUE (name);


--
-- Name: roles roles_name_key35; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key35 UNIQUE (name);


--
-- Name: roles roles_name_key36; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key36 UNIQUE (name);


--
-- Name: roles roles_name_key37; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key37 UNIQUE (name);


--
-- Name: roles roles_name_key38; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key38 UNIQUE (name);


--
-- Name: roles roles_name_key39; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key39 UNIQUE (name);


--
-- Name: roles roles_name_key4; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key4 UNIQUE (name);


--
-- Name: roles roles_name_key40; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key40 UNIQUE (name);


--
-- Name: roles roles_name_key41; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key41 UNIQUE (name);


--
-- Name: roles roles_name_key42; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key42 UNIQUE (name);


--
-- Name: roles roles_name_key43; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key43 UNIQUE (name);


--
-- Name: roles roles_name_key44; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key44 UNIQUE (name);


--
-- Name: roles roles_name_key45; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key45 UNIQUE (name);


--
-- Name: roles roles_name_key46; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key46 UNIQUE (name);


--
-- Name: roles roles_name_key47; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key47 UNIQUE (name);


--
-- Name: roles roles_name_key48; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key48 UNIQUE (name);


--
-- Name: roles roles_name_key49; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key49 UNIQUE (name);


--
-- Name: roles roles_name_key5; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key5 UNIQUE (name);


--
-- Name: roles roles_name_key50; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key50 UNIQUE (name);


--
-- Name: roles roles_name_key51; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key51 UNIQUE (name);


--
-- Name: roles roles_name_key52; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key52 UNIQUE (name);


--
-- Name: roles roles_name_key53; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key53 UNIQUE (name);


--
-- Name: roles roles_name_key54; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key54 UNIQUE (name);


--
-- Name: roles roles_name_key55; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key55 UNIQUE (name);


--
-- Name: roles roles_name_key56; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key56 UNIQUE (name);


--
-- Name: roles roles_name_key57; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key57 UNIQUE (name);


--
-- Name: roles roles_name_key58; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key58 UNIQUE (name);


--
-- Name: roles roles_name_key59; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key59 UNIQUE (name);


--
-- Name: roles roles_name_key6; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key6 UNIQUE (name);


--
-- Name: roles roles_name_key60; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key60 UNIQUE (name);


--
-- Name: roles roles_name_key61; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key61 UNIQUE (name);


--
-- Name: roles roles_name_key62; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key62 UNIQUE (name);


--
-- Name: roles roles_name_key63; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key63 UNIQUE (name);


--
-- Name: roles roles_name_key64; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key64 UNIQUE (name);


--
-- Name: roles roles_name_key65; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key65 UNIQUE (name);


--
-- Name: roles roles_name_key66; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key66 UNIQUE (name);


--
-- Name: roles roles_name_key67; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key67 UNIQUE (name);


--
-- Name: roles roles_name_key68; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key68 UNIQUE (name);


--
-- Name: roles roles_name_key69; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key69 UNIQUE (name);


--
-- Name: roles roles_name_key7; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key7 UNIQUE (name);


--
-- Name: roles roles_name_key70; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key70 UNIQUE (name);


--
-- Name: roles roles_name_key71; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key71 UNIQUE (name);


--
-- Name: roles roles_name_key72; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key72 UNIQUE (name);


--
-- Name: roles roles_name_key73; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key73 UNIQUE (name);


--
-- Name: roles roles_name_key74; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key74 UNIQUE (name);


--
-- Name: roles roles_name_key75; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key75 UNIQUE (name);


--
-- Name: roles roles_name_key76; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key76 UNIQUE (name);


--
-- Name: roles roles_name_key77; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key77 UNIQUE (name);


--
-- Name: roles roles_name_key78; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key78 UNIQUE (name);


--
-- Name: roles roles_name_key79; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key79 UNIQUE (name);


--
-- Name: roles roles_name_key8; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key8 UNIQUE (name);


--
-- Name: roles roles_name_key80; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key80 UNIQUE (name);


--
-- Name: roles roles_name_key81; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key81 UNIQUE (name);


--
-- Name: roles roles_name_key82; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key82 UNIQUE (name);


--
-- Name: roles roles_name_key83; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key83 UNIQUE (name);


--
-- Name: roles roles_name_key84; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key84 UNIQUE (name);


--
-- Name: roles roles_name_key85; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key85 UNIQUE (name);


--
-- Name: roles roles_name_key86; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key86 UNIQUE (name);


--
-- Name: roles roles_name_key87; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key87 UNIQUE (name);


--
-- Name: roles roles_name_key88; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key88 UNIQUE (name);


--
-- Name: roles roles_name_key89; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key89 UNIQUE (name);


--
-- Name: roles roles_name_key9; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key9 UNIQUE (name);


--
-- Name: roles roles_name_key90; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key90 UNIQUE (name);


--
-- Name: roles roles_name_key91; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key91 UNIQUE (name);


--
-- Name: roles roles_name_key92; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key92 UNIQUE (name);


--
-- Name: roles roles_name_key93; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key93 UNIQUE (name);


--
-- Name: roles roles_name_key94; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key94 UNIQUE (name);


--
-- Name: roles roles_name_key95; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key95 UNIQUE (name);


--
-- Name: roles roles_name_key96; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key96 UNIQUE (name);


--
-- Name: roles roles_name_key97; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key97 UNIQUE (name);


--
-- Name: roles roles_name_key98; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key98 UNIQUE (name);


--
-- Name: roles roles_name_key99; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key99 UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: user_groups user_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_pkey PRIMARY KEY (id);


--
-- Name: user_groups user_groups_user_id_group_id_key; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_user_id_group_id_key UNIQUE (user_id, group_id);


--
-- Name: user_logs user_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.user_logs
    ADD CONSTRAINT user_logs_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- Name: users users_email_key10; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key10 UNIQUE (email);


--
-- Name: users users_email_key11; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key11 UNIQUE (email);


--
-- Name: users users_email_key12; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key12 UNIQUE (email);


--
-- Name: users users_email_key13; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key13 UNIQUE (email);


--
-- Name: users users_email_key14; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key14 UNIQUE (email);


--
-- Name: users users_email_key15; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key15 UNIQUE (email);


--
-- Name: users users_email_key16; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key16 UNIQUE (email);


--
-- Name: users users_email_key17; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key17 UNIQUE (email);


--
-- Name: users users_email_key18; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key18 UNIQUE (email);


--
-- Name: users users_email_key19; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key19 UNIQUE (email);


--
-- Name: users users_email_key2; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key2 UNIQUE (email);


--
-- Name: users users_email_key20; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key20 UNIQUE (email);


--
-- Name: users users_email_key21; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key21 UNIQUE (email);


--
-- Name: users users_email_key22; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key22 UNIQUE (email);


--
-- Name: users users_email_key23; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key23 UNIQUE (email);


--
-- Name: users users_email_key24; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key24 UNIQUE (email);


--
-- Name: users users_email_key25; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key25 UNIQUE (email);


--
-- Name: users users_email_key26; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key26 UNIQUE (email);


--
-- Name: users users_email_key27; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key27 UNIQUE (email);


--
-- Name: users users_email_key28; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key28 UNIQUE (email);


--
-- Name: users users_email_key29; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key29 UNIQUE (email);


--
-- Name: users users_email_key3; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key3 UNIQUE (email);


--
-- Name: users users_email_key30; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key30 UNIQUE (email);


--
-- Name: users users_email_key31; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key31 UNIQUE (email);


--
-- Name: users users_email_key32; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key32 UNIQUE (email);


--
-- Name: users users_email_key33; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key33 UNIQUE (email);


--
-- Name: users users_email_key34; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key34 UNIQUE (email);


--
-- Name: users users_email_key35; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key35 UNIQUE (email);


--
-- Name: users users_email_key36; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key36 UNIQUE (email);


--
-- Name: users users_email_key37; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key37 UNIQUE (email);


--
-- Name: users users_email_key38; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key38 UNIQUE (email);


--
-- Name: users users_email_key39; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key39 UNIQUE (email);


--
-- Name: users users_email_key4; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key4 UNIQUE (email);


--
-- Name: users users_email_key40; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key40 UNIQUE (email);


--
-- Name: users users_email_key41; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key41 UNIQUE (email);


--
-- Name: users users_email_key42; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key42 UNIQUE (email);


--
-- Name: users users_email_key43; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key43 UNIQUE (email);


--
-- Name: users users_email_key44; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key44 UNIQUE (email);


--
-- Name: users users_email_key45; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key45 UNIQUE (email);


--
-- Name: users users_email_key46; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key46 UNIQUE (email);


--
-- Name: users users_email_key47; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key47 UNIQUE (email);


--
-- Name: users users_email_key48; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key48 UNIQUE (email);


--
-- Name: users users_email_key49; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key49 UNIQUE (email);


--
-- Name: users users_email_key5; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key5 UNIQUE (email);


--
-- Name: users users_email_key50; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key50 UNIQUE (email);


--
-- Name: users users_email_key51; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key51 UNIQUE (email);


--
-- Name: users users_email_key52; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key52 UNIQUE (email);


--
-- Name: users users_email_key53; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key53 UNIQUE (email);


--
-- Name: users users_email_key54; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key54 UNIQUE (email);


--
-- Name: users users_email_key55; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key55 UNIQUE (email);


--
-- Name: users users_email_key56; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key56 UNIQUE (email);


--
-- Name: users users_email_key57; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key57 UNIQUE (email);


--
-- Name: users users_email_key58; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key58 UNIQUE (email);


--
-- Name: users users_email_key59; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key59 UNIQUE (email);


--
-- Name: users users_email_key6; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key6 UNIQUE (email);


--
-- Name: users users_email_key60; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key60 UNIQUE (email);


--
-- Name: users users_email_key61; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key61 UNIQUE (email);


--
-- Name: users users_email_key62; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key62 UNIQUE (email);


--
-- Name: users users_email_key63; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key63 UNIQUE (email);


--
-- Name: users users_email_key64; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key64 UNIQUE (email);


--
-- Name: users users_email_key65; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key65 UNIQUE (email);


--
-- Name: users users_email_key66; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key66 UNIQUE (email);


--
-- Name: users users_email_key67; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key67 UNIQUE (email);


--
-- Name: users users_email_key68; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key68 UNIQUE (email);


--
-- Name: users users_email_key69; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key69 UNIQUE (email);


--
-- Name: users users_email_key7; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key7 UNIQUE (email);


--
-- Name: users users_email_key70; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key70 UNIQUE (email);


--
-- Name: users users_email_key71; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key71 UNIQUE (email);


--
-- Name: users users_email_key72; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key72 UNIQUE (email);


--
-- Name: users users_email_key73; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key73 UNIQUE (email);


--
-- Name: users users_email_key74; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key74 UNIQUE (email);


--
-- Name: users users_email_key75; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key75 UNIQUE (email);


--
-- Name: users users_email_key76; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key76 UNIQUE (email);


--
-- Name: users users_email_key77; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key77 UNIQUE (email);


--
-- Name: users users_email_key8; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key8 UNIQUE (email);


--
-- Name: users users_email_key9; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key9 UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: users users_username_key1; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key1 UNIQUE (username);


--
-- Name: users users_username_key10; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key10 UNIQUE (username);


--
-- Name: users users_username_key11; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key11 UNIQUE (username);


--
-- Name: users users_username_key12; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key12 UNIQUE (username);


--
-- Name: users users_username_key13; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key13 UNIQUE (username);


--
-- Name: users users_username_key14; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key14 UNIQUE (username);


--
-- Name: users users_username_key15; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key15 UNIQUE (username);


--
-- Name: users users_username_key16; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key16 UNIQUE (username);


--
-- Name: users users_username_key17; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key17 UNIQUE (username);


--
-- Name: users users_username_key18; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key18 UNIQUE (username);


--
-- Name: users users_username_key19; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key19 UNIQUE (username);


--
-- Name: users users_username_key2; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key2 UNIQUE (username);


--
-- Name: users users_username_key20; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key20 UNIQUE (username);


--
-- Name: users users_username_key21; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key21 UNIQUE (username);


--
-- Name: users users_username_key22; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key22 UNIQUE (username);


--
-- Name: users users_username_key23; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key23 UNIQUE (username);


--
-- Name: users users_username_key24; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key24 UNIQUE (username);


--
-- Name: users users_username_key25; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key25 UNIQUE (username);


--
-- Name: users users_username_key26; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key26 UNIQUE (username);


--
-- Name: users users_username_key27; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key27 UNIQUE (username);


--
-- Name: users users_username_key28; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key28 UNIQUE (username);


--
-- Name: users users_username_key29; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key29 UNIQUE (username);


--
-- Name: users users_username_key3; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key3 UNIQUE (username);


--
-- Name: users users_username_key30; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key30 UNIQUE (username);


--
-- Name: users users_username_key31; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key31 UNIQUE (username);


--
-- Name: users users_username_key32; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key32 UNIQUE (username);


--
-- Name: users users_username_key33; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key33 UNIQUE (username);


--
-- Name: users users_username_key34; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key34 UNIQUE (username);


--
-- Name: users users_username_key35; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key35 UNIQUE (username);


--
-- Name: users users_username_key36; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key36 UNIQUE (username);


--
-- Name: users users_username_key37; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key37 UNIQUE (username);


--
-- Name: users users_username_key38; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key38 UNIQUE (username);


--
-- Name: users users_username_key39; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key39 UNIQUE (username);


--
-- Name: users users_username_key4; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key4 UNIQUE (username);


--
-- Name: users users_username_key40; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key40 UNIQUE (username);


--
-- Name: users users_username_key41; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key41 UNIQUE (username);


--
-- Name: users users_username_key42; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key42 UNIQUE (username);


--
-- Name: users users_username_key43; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key43 UNIQUE (username);


--
-- Name: users users_username_key44; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key44 UNIQUE (username);


--
-- Name: users users_username_key45; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key45 UNIQUE (username);


--
-- Name: users users_username_key46; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key46 UNIQUE (username);


--
-- Name: users users_username_key47; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key47 UNIQUE (username);


--
-- Name: users users_username_key48; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key48 UNIQUE (username);


--
-- Name: users users_username_key49; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key49 UNIQUE (username);


--
-- Name: users users_username_key5; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key5 UNIQUE (username);


--
-- Name: users users_username_key50; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key50 UNIQUE (username);


--
-- Name: users users_username_key51; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key51 UNIQUE (username);


--
-- Name: users users_username_key52; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key52 UNIQUE (username);


--
-- Name: users users_username_key53; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key53 UNIQUE (username);


--
-- Name: users users_username_key54; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key54 UNIQUE (username);


--
-- Name: users users_username_key55; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key55 UNIQUE (username);


--
-- Name: users users_username_key56; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key56 UNIQUE (username);


--
-- Name: users users_username_key57; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key57 UNIQUE (username);


--
-- Name: users users_username_key58; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key58 UNIQUE (username);


--
-- Name: users users_username_key59; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key59 UNIQUE (username);


--
-- Name: users users_username_key6; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key6 UNIQUE (username);


--
-- Name: users users_username_key60; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key60 UNIQUE (username);


--
-- Name: users users_username_key61; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key61 UNIQUE (username);


--
-- Name: users users_username_key62; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key62 UNIQUE (username);


--
-- Name: users users_username_key63; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key63 UNIQUE (username);


--
-- Name: users users_username_key64; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key64 UNIQUE (username);


--
-- Name: users users_username_key65; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key65 UNIQUE (username);


--
-- Name: users users_username_key66; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key66 UNIQUE (username);


--
-- Name: users users_username_key67; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key67 UNIQUE (username);


--
-- Name: users users_username_key68; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key68 UNIQUE (username);


--
-- Name: users users_username_key69; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key69 UNIQUE (username);


--
-- Name: users users_username_key7; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key7 UNIQUE (username);


--
-- Name: users users_username_key70; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key70 UNIQUE (username);


--
-- Name: users users_username_key71; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key71 UNIQUE (username);


--
-- Name: users users_username_key72; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key72 UNIQUE (username);


--
-- Name: users users_username_key73; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key73 UNIQUE (username);


--
-- Name: users users_username_key74; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key74 UNIQUE (username);


--
-- Name: users users_username_key75; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key75 UNIQUE (username);


--
-- Name: users users_username_key76; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key76 UNIQUE (username);


--
-- Name: users users_username_key77; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key77 UNIQUE (username);


--
-- Name: users users_username_key78; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key78 UNIQUE (username);


--
-- Name: users users_username_key8; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key8 UNIQUE (username);


--
-- Name: users users_username_key9; Type: CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key9 UNIQUE (username);


--
-- Name: user_groups user_groups_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_group_id_fkey FOREIGN KEY (group_id) REFERENCES public.groups(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_groups user_groups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.user_groups
    ADD CONSTRAINT user_groups_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_logs user_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: lomix
--

ALTER TABLE ONLY public.user_logs
    ADD CONSTRAINT user_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict mniOHxUXt1gMeM8E764bbxyzNng1eVoKgDbprd4IXBIgXYiw0TYTR4xe3eZ9I3t

