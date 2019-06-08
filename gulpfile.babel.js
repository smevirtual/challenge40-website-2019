/**
 * Copyright 2019 SME Texaplex Virtual Chapter Contributors. All Rights Reserved.
 * Copyright 2018 SME Virtual Network Contributors. All Rights Reserved.
 * See LICENSE in the repository root for license information.
 * =============================================================================
 */

import BrowserSync from "browser-sync";
import { spawn } from "child_process";
import del from "del";
import gulp from "gulp";
import log from "fancy-log";
import webpack from "webpack";
import webpackConfig from "./webpack.config.babel";

const browserSync = BrowserSync.create();

const IS_PRODUCTION = process.env.NODE_ENV === "production";

log.warn("[Gulp] build mode: ", IS_PRODUCTION ? "PRODUCTION" : "DEVELOPMENT");

let suppressHugoErrors = false;
const defaultHugoArgs = ["-d", "docs", "--config", "config.toml,leadership_team.toml"];

// Sitemaps need the absolute URL (along with the scheme) to be compatible with
// major search engines. This changes the `baseURL` Hugo configuration setting
// prior to deployment.
if (process.env.DEPLOY_BASE_URL) {
  defaultHugoArgs.push("-b");
  defaultHugoArgs.push(process.env.DEPLOY_BASE_URL);
}

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
gulp.task("copy:images", () => gulp.src(["frontend/images/**", "frontend/meta/**"]).pipe(gulp.dest("docs")));

/**
 * COPY CONFIGS TASK
 * -----------------------------------------------------------------------------
 */
gulp.task("copy:configs", () => gulp.src(["frontend/**/*.json"]).pipe(gulp.dest("docs")));

/**
 * CLEAN TASK
 * -----------------------------------------------------------------------------
 */
gulp.task("clean", () => del(["docs/**", "!docs", "!docs/CNAME"]));

/**
 * RUN DEVELOPMENT SERVER TASK
 * -----------------------------------------------------------------------------
 * Run the development server with Browsersync. Gulp will watch for source file
 * changes and Browsersync will reload the browser as necessary.
 */
gulp.task("dev-server", () => {
  suppressHugoErrors = true;
  browserSync.init({
    host: "lvh.me",
    port: 3000,
    open: "external",
    server: {
      baseDir: "./docs"
    }
  });
  gulp.watch(["*.toml", "./archetypes/**/*", "./content/**/*", "./layouts/**/*"], gulp.series("hugo"));
  gulp.watch(["./frontend/**/*"], gulp.series("bundle", "copy:images", "copy:configs"));
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
gulp.task("build", gulp.series("clean", "bundle", "hugo", "copy:images", "copy:configs"));

/**
 * LOCAL SERVER RUN TASK
 * -----------------------------------------------------------------------------
 */
gulp.task("serve", gulp.series("build", "dev-server"));
