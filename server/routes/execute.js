const express = require("express");
const router = express.Router();
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

router.post("/", async (req, res) => {
  const { code, language } = req.body;

  if (!code) {
    return res.status(400).json({
      success: false,
      output: "Code is required",
    });
  }

  const jobId = uuidv4();
  const tempDir = path.join(__dirname, "../temp");

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
  }

  let fileName = "";
  let command = "";
  let exePath = "";

  try {
    // =======================
    // C++
    // =======================
    if (language === "cpp" || language === "c++") {
      fileName = path.join(tempDir, `${jobId}.cpp`);
      exePath = path.join(tempDir, `${jobId}.exe`);

      fs.writeFileSync(fileName, code);

      command = `g++ "${fileName}" -o "${exePath}" && "${exePath}"`;
    }

    // =======================
    // Python
    // =======================
    else if (language === "python") {
      fileName = path.join(tempDir, `${jobId}.py`);

      fs.writeFileSync(fileName, code);

      command = `python "${fileName}"`;
    }

    // =======================
    // JavaScript
    // =======================
    else if (language === "javascript" || language === "js") {
      fileName = path.join(tempDir, `${jobId}.js`);

      fs.writeFileSync(fileName, code);

      command = `node "${fileName}"`;
    }

    else {
      return res.status(400).json({
        success: false,
        output: "Unsupported language",
      });
    }

    console.log("\n============================");
    console.log("Executing Command:");
    console.log(command);
    console.log("============================\n");

    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
      // Cleanup
      try {
        if (fs.existsSync(fileName)) {
          fs.unlinkSync(fileName);
        }

        if (exePath && fs.existsSync(exePath)) {
          fs.unlinkSync(exePath);
        }
      } catch (e) {
        console.log("Cleanup Error:", e.message);
      }

      if (error) {
        console.log("EXEC ERROR:");
        console.log(error);

        console.log("STDERR:");
        console.log(stderr);

        return res.json({
          success: false,
          output: stderr || error.message,
        });
      }

      return res.json({
        success: true,
        output: stdout || "Program executed successfully.",
      });
    });
  } catch (err) {
    console.log(err);

    return res.status(500).json({
      success: false,
      output: err.message,
    });
  }
});

module.exports = router;