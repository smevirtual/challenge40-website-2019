/**
 * Copyright 2019 SME Texaplex Virtual Chapter Contributors. All Rights Reserved.
 * Copyright 2018 SME Virtual Network Contributors. All Rights Reserved.
 * See LICENSE in the repository root for license information.
 * =============================================================================
 */

import BrowserSync from "browser-sync";
import { spawn } from "child_process";
import del from "del";
import fs from "fs";
import gulp from "gulp";
import log from "fancy-log";
import realFavicon from "gulp-real-favicon";
import webpack from "webpack";
import webpackConfig from "./webpack.config.babel";

const browserSync = BrowserSync.create();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

log.warn("[Gulp] build mode: ", IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT");

let suppressHugoErrors = false;
const defaultHugoArgs = [
  "-d",
  "dist",
  "--config",
  "config.toml,contributors.toml,leadership_team.toml,sponsors.toml,partners.toml"
];

// Sitemaps need the absolute URL (along with the scheme) to be compatible with
// major search engines. This changes the `baseURL` Hugo configuration setting
// prior to deployment.
if (process.env.DEPLOY_BASE_URL) {
  defaultHugoArgs.push("-b");
  defaultHugoArgs.push(process.env.DEPLOY_BASE_URL);
}

const FAVICON_DATA_FILE = "favicondata.json";

/**
 * WEBPACK BUNDLE TASK
 * -----------------------------------------------------------------------------
 */
gulp.task("bundle", callback => {
  webpack(webpackConfig, (err, stats) => {
    if (err || stats.hasErrors()) {
      log.error("Bundle error: ", err);
      callback();
    }
    log.info("[Webpack] running...");
    log.info(
      stats.toString({
        chunks: false,
        colors: true
      })
    );
    browserSync.reload();
    callback();
  });
});

/**
 * COPY IMAGES TASK
 * -----------------------------------------------------------------------------
 */
gulp.task("copy:images", () => gulp.src(["frontend/images/**/*"]).pipe(gulp.dest("dist")));

/**
 * COPY CONFIGS TASK
 * -----------------------------------------------------------------------------
 */
gulp.task("copy:configs", () => gulp.src(["frontend/**/*.json"]).pipe(gulp.dest("dist")));

/**
 * CLEAN TASK
 * -----------------------------------------------------------------------------
 */
gulp.task("clean", () => del(["dist/**/*"]));

/**
 * RUN DEVELOPMENT SERVER TASK
 * -----------------------------------------------------------------------------
 * Run the development server with Browsersync. Gulp will watch for source file
 * changes and Browsersync will reload the browser as necessary.
 */
gulp.task("dev-server", () => {
  suppressHugoErrors = true;
  browserSync.init({
    server: {
      baseDir: "./dist"
    }
  });
  gulp.watch(
    ["*.toml", "./archetypes/**/*", "./content/**/*", "./layouts/**/*"],
    gulp.series("hugo", "inject-favicon")
  );
  gulp.watch(["./frontend/**/*"], gulp.series("bundle", "copy:images", "copy:configs"));
});

/**
 * GENERATE FAVICONS TASK
 * -----------------------------------------------------------------------------
 * Generates all of the favicons and other icon assets from the master favicon
 * image.
 */
gulp.task("generate-favicon", done => {
  realFavicon.generateFavicon(
    {
      masterPicture: "./frontend/images/master-favicon-512.png",
      dest: "./dist",
      iconsPath: "/",
      design: {
        ios: {
          pictureAspect: "backgroundAndMargin",
          backgroundColor: "#000000",
          margin: "0%",
          assets: {
            ios6AndPriorIcons: false,
            ios7AndLaterIcons: false,
            precomposedIcons: false,
            declareOnlyDefaultIcon: true
          },
          appName: "SME Texaplex Virtual Chapter"
        },
        desktopBrowser: {},
        windows: {
          pictureAspect: "noChange",
          backgroundColor: "#000000",
          onConflict: "override",
          assets: {
            windows80Ie10Tile: false,
            windows10Ie11EdgeTiles: {
              small: false,
              medium: true,
              big: false,
              rectangle: false
            }
          },
          appName: "SME Texaplex Virtual Chapter"
        },
        androidChrome: {
          pictureAspect: "backgroundAndMargin",
          margin: "0%",
          backgroundColor: "#000000",
          themeColor: "#000000",
          manifest: {
            name: "SME Texaplex Virtual Chapter",
            display: "browser",
            orientation: "notSet",
            onConflict: "override",
            declared: true
          },
          assets: {
            legacyIcon: false,
            lowResolutionIcons: false
          }
        },
        safariPinnedTab: {
          pictureAspect: "silhouette",
          themeColor: "#000000"
        }
      },
      settings: {
        scalingAlgorithm: "Mitchell",
        errorOnImageTooSmall: false,
        readmeFile: false,
        htmlCodeFile: false,
        usePathAsIs: false
      },
      versioning: {
        paramName: "v",
        paramValue: "qABA4X8PYp"
      },
      markupFile: FAVICON_DATA_FILE
    },
    () => {
      done();
    }
  );
});

/**
 * INJECT FAVICONS TASK
 * -----------------------------------------------------------------------------
 * Injects the generated favicons and icon assets into the `index.html` file.
 */
gulp.task("inject-favicon", () =>
  gulp
    .src(["dist/*.html"])
    .pipe(
      realFavicon.injectFaviconMarkups(JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).favicon.html_code, {
        keep: 'meta[property="og:image"]'
      })
    )
    .pipe(gulp.dest("dist"))
);

/**
 * CHECK FOR FAVICON STYLE/SETTING UPDATES TASK
 * -----------------------------------------------------------------------------
 * Run a check with the RealFaviconGenerator service (https://realfavicongenerator.net/)
 * for potential updates for favicons. This is important because from time-to-time,
 * device, platform and web browsers update their favicon and icon requirements.
 */
gulp.task("check-favicon-update", () => {
  const currentVersion = JSON.parse(fs.readFileSync(FAVICON_DATA_FILE)).version;
  realFavicon.checkForUpdates(currentVersion, err => {
    if (err) {
      throw err;
    }
  });
});

/**
 * HUGO BUILD TASK
 * -----------------------------------------------------------------------------
 * Builds the Hugo static site.
 */
gulp.task("hugo", done =>
  spawn("hugo", defaultHugoArgs, { stdio: "inherit" }).on("close", code => {
    if (suppressHugoErrors || code === 0) {
      browserSync.reload();
      done();
    } else {
      log.error("Hugo build task failed.");
      done();
    }
  })
);

/**
 * BUILD TASK
 * -----------------------------------------------------------------------------
 */
gulp.task(
  "build",
  gulp.series("clean", "generate-favicon", "bundle", "hugo", "copy:images", "copy:configs", "inject-favicon")
);

/**
 * LOCAL SERVER RUN TASK
 * -----------------------------------------------------------------------------
 */
gulp.task("serve", gulp.series("build", "dev-server"));
