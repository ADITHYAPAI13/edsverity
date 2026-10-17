"""Frontend regression tests with an explicit Supabase SDK double; never writes live data."""
import functools
import json
import threading
import unittest
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
SDK = (ROOT / 'tests/fixtures/supabase.js').read_text()


class QuietHandler(SimpleHTTPRequestHandler):
    def handle(self):
        try:
            super().handle()
        except (BrokenPipeError, ConnectionResetError):
            pass  # Browser redirects can cancel a response in progress.

    def translate_path(self,path):
        if path.startswith('/edsverity/'):
            path=path[len('/edsverity'):]
        return super().translate_path(path)

    def log_message(self, *_):
        pass


class BrowserTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}/'
        cls.playwright = sync_playwright().start()
        import os
        cls.browser = cls.playwright.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'), args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1440, 'height': 900})
        self.context.route('**/*', self.route)
        self.page = self.context.new_page()
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        # Any accidental native application prompt fails instead of hanging a test.
        self.dialog_handler=lambda dialog: (self.errors.append('Native dialog: ' + dialog.type), dialog.dismiss())
        self.page.on('dialog',self.dialog_handler)

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def route(self, route):
        url = route.request.url
        if url.startswith(self.base):
            route.continue_()
        elif url.startswith('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'):
            route.fulfill(status=200, content_type='application/javascript', body=SDK)
        elif 'fonts.googleapis.com' in url:
            route.fulfill(status=200, content_type='text/css', body='')
        else:
            route.abort()  # Deliberately offline, including invalid avatar fixtures.

    def go(self, path):
        self.page.goto(self.base + path, wait_until='networkidle')

    def state(self, script):
        self.page.evaluate(script + ';window.fixture.persist()')

    def guest(self):
        self.go('index.html')
        self.state('window.fixture.state.user=null')

    def open_application(self):
        self.go('careers.html')
        self.page.locator('.apply-trigger').click()
        expect(self.page.locator('#application-dialog')).to_be_visible()

    def test_application_validation_loading_success_duplicate(self):
        self.open_application()
        expect(self.page.locator('#application-job-title')).to_have_text('Research intern')
        expect(self.page.locator('#application-note')).to_be_focused()
        for invalid in ['   short  ', 'x' * 2001]:
            self.page.locator('#application-note').fill(invalid)
            self.page.locator('#application-submit').click()
            self.assertEqual(self.page.evaluate('window.fixture.state.job_applications.length'), 0)
        self.page.locator('#application-note').fill('  I have relevant research experience.  ')
        self.state('window.fixture.state.delay=350')
        self.page.locator('#application-submit').click()
        expect(self.page.locator('#application-submit')).to_be_disabled()
        self.page.keyboard.press('Escape')
        expect(self.page.locator('#application-dialog')).to_be_visible()
        expect(self.page.locator('#application-dialog')).not_to_be_visible()
        expect(self.page.locator('#list-message')).to_contain_text('was submitted')
        expect(self.page.locator('.apply-trigger')).to_be_disabled()
        self.assertEqual(self.page.evaluate('window.fixture.state.job_applications[0].cover_note'), 'I have relevant research experience.')
        self.page.reload(wait_until='networkidle')
        expect(self.page.locator('.apply-trigger')).to_be_disabled()

    def test_application_failure_retry_cancel_and_duplicate_race(self):
        self.open_application()
        self.page.keyboard.press('Escape')
        expect(self.page.locator('.apply-trigger')).to_be_focused()
        self.page.locator('.apply-trigger').click()
        self.page.locator('#application-note').fill('A meaningful application note.')
        self.state("window.fixture.state.failures['job_applications.insert']='throw'")
        self.page.locator('#application-submit').click()
        expect(self.page.locator('#application-message')).to_contain_text('connection failure')
        expect(self.page.locator('#application-submit')).to_be_enabled()
        expect(self.page.locator('#application-note')).to_have_value('A meaningful application note.')
        self.state("window.fixture.state.failures['job_applications.insert']='23505'")
        self.page.locator('#application-submit').click()
        expect(self.page.locator('#list-message')).to_contain_text('already applied')
        expect(self.page.locator('.apply-trigger')).to_be_disabled()

    def test_application_journey_owner_posts_applicant_applies_owner_reviews(self):
        self.go('careers.html')
        self.state('window.fixture.state.user=window.fixture.userA;window.fixture.state.jobs=[]')
        self.page.reload(wait_until='networkidle')
        self.page.locator('[name=title]').fill('Engineering internship')
        self.page.locator('[name=company]').fill('Test organization')
        self.page.locator('textarea[name=description]').fill('Build a documented research prototype.')
        self.page.locator('#publish-button').click()
        expect(self.page.locator('#publish-message')).to_contain_text('Published successfully')
        expect(self.page.locator('.apply-trigger')).to_have_count(0)
        self.state('window.fixture.state.user=window.fixture.userB')
        self.page.reload(wait_until='networkidle')
        self.page.locator('.apply-trigger').click()
        self.page.locator('#application-note').fill('I can build and document this prototype.')
        self.page.locator('#application-submit').click()
        expect(self.page.locator('#list-message')).to_contain_text('was submitted')
        self.go('dashboard.html')
        expect(self.page.locator('#my-applications')).to_contain_text('Engineering internship')
        expect(self.page.locator('#my-applications')).to_contain_text('submitted')
        self.state('window.fixture.state.user=window.fixture.userA')
        self.page.reload(wait_until='networkidle')
        expect(self.page.locator('#received-applications')).to_contain_text('I can build')
        self.state("window.fixture.state.failures['job_applications.update']='42501'")
        self.page.locator('.review-status').select_option('reviewing')
        expect(self.page.locator('.review-feedback')).to_contain_text('permission failure')
        expect(self.page.locator('.review-status')).to_have_value('submitted')
        self.page.locator('.review-status').select_option('shortlisted')
        expect(self.page.locator('.review-feedback')).to_have_text('Saved')
        self.state('window.fixture.state.user=window.fixture.userB')
        self.page.reload(wait_until='networkidle')
        expect(self.page.locator('#my-applications')).to_contain_text('shortlisted')
        expect(self.page.locator('#received-applications')).to_contain_text('not posted')

    def test_profile_save_error_retry_avatar_and_refresh(self):
        self.go('profile.html')
        self.page.locator('#full_name').fill('Updated Member')
        self.page.locator('#skills').fill('Research, Python')
        self.state("window.fixture.state.failures['profiles.upsert']='throw'")
        self.page.locator('#save-profile').click()
        expect(self.page.locator('#profile-message')).to_contain_text('connection failure')
        expect(self.page.locator('#save-profile')).to_be_enabled()
        self.page.locator('#save-profile').click()
        expect(self.page.locator('#profile-message')).to_contain_text('up to date')
        expect(self.page.locator('#nav-name')).to_have_text('Updated')
        expect(self.page.locator('#nav-avatar')).to_have_text('UM')
        self.page.locator('#avatar-file').set_input_files({'name':'fake.png','mimeType':'image/png','buffer':b'not an image'})
        expect(self.page.locator('#avatar-message')).to_have_class('live-error')
        expect(self.page.locator('#avatar-file')).to_be_enabled()
        import struct, zlib
        def chunk(kind,data):
            return struct.pack('!I',len(data))+kind+data+struct.pack('!I',zlib.crc32(kind+data))
        png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('!2I5B',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\x00\x00\x80\x00'))+chunk(b'IEND',b'')
        self.page.locator('#avatar-file').set_input_files({'name':'avatar.png','mimeType':'image/png','buffer':png})
        expect(self.page.locator('#avatar-message')).to_contain_text('successfully')
        self.page.reload(wait_until='networkidle')
        expect(self.page.locator('#full_name')).to_have_value('Updated Member')
        expect(self.page.locator('#skills')).to_have_value('Research, Python')
        expect(self.page.locator('#avatar-preview')).to_have_text('UM')
        expect(self.page.locator('#avatar-preview img')).to_have_count(0)  # Broken URL falls back to initials.
        self.assertIn('profile.png',self.page.evaluate('window.fixture.state.profiles[0].avatar_url'))

    def test_session_expiry_logout_failure_and_safe_redirect(self):
        self.go('dashboard.html')
        expect(self.page.locator('#account-pill')).to_be_visible()
        expect(self.page.locator('.header-signin')).not_to_be_visible()
        self.state("window.fixture.state.failures['auth.signOut']='throw'")
        self.page.locator('#account-pill summary').click()
        self.page.locator('#global-signout').click()
        expect(self.page.locator('#session-message')).to_contain_text('Unable to sign out')
        self.assertTrue(self.page.url.endswith('dashboard.html'))
        self.page.evaluate("window.fixture.emit('SIGNED_OUT',null)")
        self.page.wait_for_url('**/login.html?next=dashboard.html')
        self.go('login.html?next=https://untrusted.example/')
        self.page.locator('#email').fill('applicant@example.test')
        self.page.locator('#password').fill('test-password')
        self.page.locator('#submit-button').click()
        self.page.wait_for_url('**/dashboard.html')
        self.page.locator('#account-pill summary').click()
        self.page.locator('#global-signout').click()
        self.page.wait_for_url('**/index.html')
        expect(self.page.locator('.header-signin')).to_be_visible()

    def test_settings_retry_and_project_publish_failure(self):
        self.go('settings.html')
        self.page.locator('#settings-discoverable').check()
        self.state("window.fixture.state.failures['profiles.upsert']='42501'")
        self.page.locator('#settings-save').click()
        expect(self.page.locator('#settings-message')).to_contain_text('permission failure')
        expect(self.page.locator('#settings-save')).to_be_enabled()
        self.page.locator('#settings-save').click()
        expect(self.page.locator('#settings-message')).to_contain_text('saved')
        self.page.reload(wait_until='networkidle')
        expect(self.page.locator('#settings-discoverable')).to_be_checked()
        self.go('research_projects.html')
        self.page.locator('[name=title]').fill('Research project')
        self.page.locator('textarea[name=description]').fill('A meaningful project description.')
        self.state("window.fixture.state.failures['projects.insert']='throw'")
        self.page.locator('#publish-button').click()
        expect(self.page.locator('#publish-message')).to_contain_text('connection failure')
        expect(self.page.locator('#publish-button')).to_be_enabled()
        self.page.locator('#publish-button').click()
        expect(self.page.locator('#live-records')).to_contain_text('Research project')
        expect(self.page.locator('.delete-trigger')).to_have_count(1)
        self.state('window.fixture.state.user=window.fixture.userA')
        self.page.reload(wait_until='networkidle')
        expect(self.page.locator('.delete-trigger')).to_have_count(0)
        self.state('window.fixture.state.user=window.fixture.userB')
        self.page.reload(wait_until='networkidle')
        self.page.remove_listener('dialog',self.dialog_handler)
        self.page.on('dialog',lambda dialog: dialog.accept())
        self.page.locator('.delete-trigger').click()
        expect(self.page.locator('#live-records')).to_contain_text('Nothing posted yet')

    def test_forum_failure_retry_replies_and_safe_text(self):
        self.go('forum.html')
        self.page.locator('[name=title]').fill('Discuss a research question')
        self.page.locator('[name=body]').fill('<img src=x onerror=alert(1)> How should we test this?')
        self.state("window.fixture.state.failures['forum_threads.insert']='throw'")
        self.page.locator('#thread-submit').click()
        expect(self.page.locator('#thread-message')).to_contain_text('connection failure')
        expect(self.page.locator('#thread-submit')).to_be_enabled()
        self.page.locator('#thread-submit').click()
        expect(self.page.locator('#forum-feed')).to_contain_text('<img src=x')
        expect(self.page.locator('#forum-feed img')).to_have_count(0)
        self.page.locator('.view-replies').click()
        self.page.locator('.reply-form textarea').fill('This is a useful reply.')
        self.state("window.fixture.state.failures['forum_replies.insert']='throw'")
        self.page.locator('.reply-form button').click()
        expect(self.page.locator('.reply-status')).to_contain_text('connection failure')
        expect(self.page.locator('.reply-form button')).to_be_enabled()
        self.page.locator('.reply-form button').click()
        expect(self.page.locator('.reply')).to_contain_text('This is a useful reply.')

    def test_guest_routes_and_auth_failure_are_distinct(self):
        self.guest()
        self.go('profile.html')
        self.page.wait_for_url('**/login.html?next=profile.html')
        expect(self.page.locator('#submit-button')).to_be_enabled()
        self.go('careers.html')
        expect(self.page.locator('.apply-trigger')).to_have_count(0)
        expect(self.page.locator('#publish-form')).not_to_be_visible()
        self.state("window.fixture.state.user=window.fixture.userB;window.fixture.state.failures['auth.getUser']='throw'")
        self.go('profile.html')
        self.assertTrue(self.page.url.endswith('profile.html'))
        expect(self.page.locator('#page-message')).to_contain_text('Account services could not load')
        expect(self.page.locator('#save-profile')).to_be_disabled()

    def test_navigation_exclusive_menus_mobile_keyboard_and_resize(self):
        self.go('index.html')
        self.page.locator('#all-sections summary').click()
        self.page.locator('#account-pill summary').click()
        expect(self.page.locator('#all-sections')).not_to_have_attribute('open', '')
        self.page.keyboard.press('Escape')
        expect(self.page.locator('#account-pill summary')).to_be_focused()
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.locator('.menu-toggle').click()
        expect(self.page.locator('#mobile-menu')).to_be_visible()
        hrefs=self.page.locator('#mobile-menu a').evaluate_all('(els)=>els.map(e=>e.getAttribute("href"))')
        self.assertEqual(len(hrefs),len(set(hrefs)))
        self.page.keyboard.press('Escape')
        expect(self.page.locator('.menu-toggle')).to_be_focused()
        expect(self.page.locator('.menu-toggle')).to_have_attribute('aria-label','Open navigation')
        self.page.locator('.menu-toggle').click()
        self.page.set_viewport_size({'width':1440,'height':900})
        expect(self.page.locator('#mobile-menu')).not_to_be_visible()

    def test_github_pages_subdirectory_login_return(self):
        self.guest()
        self.go('edsverity/profile.html')
        self.page.wait_for_url('**/edsverity/login.html?next=profile.html')
        self.page.locator('#email').fill('applicant@example.test')
        self.page.locator('#password').fill('test-password')
        self.page.locator('#submit-button').click()
        self.page.wait_for_url('**/edsverity/profile.html')
        expect(self.page.locator('#save-profile')).to_be_enabled()

    def test_sdk_failure_is_visible_and_controls_stay_disabled(self):
        self.context.unroute('**/*')
        self.context.route('**/*',lambda route: route.continue_() if route.request.url.startswith(self.base) else route.abort())
        self.go('profile.html')
        expect(self.page.locator('#page-message')).to_contain_text('Account services could not load')
        expect(self.page.locator('#save-profile')).to_be_disabled()
        self.page.set_viewport_size({'width':390,'height':844})
        self.page.locator('.menu-toggle').click()
        expect(self.page.locator('#mobile-menu')).to_be_visible()

    def test_all_pages_and_application_dialog_responsive(self):
        for width in [1440,1024,768,390,320]:
            self.page.set_viewport_size({'width':width,'height':900})
            for path in sorted(ROOT.glob('*.html')):
                if path.name=='backend-test.html':continue
                self.go(path.name)
                with self.subTest(width=width,page=path.name):
                    self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'))
                    expect(self.page.locator('main')).to_be_visible()
                    expect(self.page.locator('main .live-feed')).not_to_contain_text('Loading') if self.page.locator('main .live-feed').count()==1 else None
            self.go('careers.html')
            self.page.locator('.apply-trigger').click()
            expect(self.page.locator('#application-cancel')).to_be_in_viewport()
            self.assertFalse(self.page.evaluate('document.documentElement.scrollWidth > innerWidth + 1'))


if __name__ == '__main__':
    unittest.main()
