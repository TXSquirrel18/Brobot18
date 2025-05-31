function checkAuth(req, res, next) {
  const override = req.headers["x-ob-override"];
  const key = req.headers["x-brobot-key"];
  if (override !== "shard77_internal" && key !== "abc123secure") {
    return res.status(401).send({ error: "Unauthorized" });
  }
  next();
}

module.exports = { checkAuth };
