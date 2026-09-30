const app = require('./src/app');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  require('./src/jobs/patternDetectionJob').startPatternDetectionJob();
  require('./src/jobs/weeklyScheduleGeneratorJob').startWeeklyScheduleGeneratorJob();
});
