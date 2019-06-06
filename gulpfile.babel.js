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
      masterPicture: "./frontend/images/master-favicon-512--default.png",
      dest: "./dist",
      iconsPath: "/",
      design: {
        ios: {
          masterPicture: {
            type: "inline",
            content:
              "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"
          },
          pictureAspect: "noChange",
          assets: {
            ios6AndPriorIcons: false,
            ios7AndLaterIcons: false,
            precomposedIcons: false,
            declareOnlyDefaultIcon: true
          },
          appName: "SME Texaplex"
        },
        desktopBrowser: {},
        windows: {
          pictureAspect: "noChange",
          backgroundColor: "#ff0000",
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
          appName: "SME Texaplex"
        },
        androidChrome: {
          pictureAspect: "noChange",
          themeColor: "#ffffff",
          manifest: {
            name: "SME Texaplex",
            display: "standalone",
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
          themeColor: "#3151b7"
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
        paramValue: "ng9EBlgWjn"
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
