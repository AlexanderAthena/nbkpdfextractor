<template>
    <div>
        <div style="display: flex; justify-content: space-between">
            <img style="width: 100px" src="nbk_logo.jpeg">
            <div style="display: flex; justify-content: center; padding: 10px">
                <div class="pressable-button" @click="activeView = 'Extract'" :style="activeView == 'Extract' ? {background: '#2c3e50', color: 'white'} : {}">Extract & Divide</div>
                <div class="pressable-button" @click="activeView = 'Separate'" :style="activeView == 'Separate' ? {background: '#2c3e50', color: 'white'} : {}">Separate Courts</div>
            </div>
        </div>
        
        <div v-if="activeView == 'Extract'" style="margin-top: 100px">
            <input class="styled-number-input" type="number" v-model="numberOfFiles"/>
            <input type="file" multiple accept="application/pdf" @change="files = [...$event.target.files]" id="file-upload" hidden/>
            <label for="file-upload" class="custom-file-upload">Select Files</label>

            <button @click="processPDFs" class="pressable-button" style="height: 50px;font-size: 20px; font-weight: 700">Generate PDF</button>
            <p v-if="remainingCount">Files remaining: {{ remainingCount }}</p>
            <div v-if="newPdfUrls.length > 0" style="text-decoration: none; padding-top: 50px; font-size: 20px; font-weight: 700; ">
                <div v-for="(url,i) in newPdfUrls" v-bind:key="i">
                    <a :href="url" :download="`combined-${i+1}.pdf`">Download PDF {{ i+1 }}</a>
                </div>
            </div>
            <ul v-if="corruptedFiles.length > 0">
                <li v-for="file in corruptedFiles" :key="file">Corrupted: {{ file }}</li>
            </ul>
        </div>

        <div v-if="activeView == 'Separate'" >
            <div>
                <h1>Split PDF file according to court</h1>
            </div>
            <div style="display: flex">
                <div style="width: 50%">
                    <input type="file" accept="application/pdf" @change="onFileChange" id="file-upload2" hidden/>
                    <label for="file-upload2" class="custom-file-upload">Select File</label>
                    <button @click="processPDF" :disabled="!pdfFile" class="pressable-button" style="height: 50px;font-size: 20px; font-weight: 700">Generate PDFs</button>
    
                    <div v-if="corrupted" style="color: red;">
                    <p>Failed to process the PDF. It might be corrupted.</p>
                    </div>
    
                    <ul>
                    <li v-for="file in generatedPdfUrls" :key="file.email">
                        <a :href="file.url" :download="`${file.email}.pdf`">
                        Download {{ file.email }}'s PDF
                        </a>
                    </li>
                    </ul>
                </div>
                <div v-if="statusLog.length > 0" style="text-align: center; width: 50%; height: 500px; overflow: scroll">
                    <div v-for="(sl, i) in statusLog" v-bind:key="i">{{ sl }}</div>
                </div>
            </div>
        </div>

    </div>
</template>

<script setup>
import { ref } from 'vue';
import { PDFDocument } from 'pdf-lib';
// import * as pdfjs from 'pdfjs-dist/legacy/build/pdf';
import * as pdfjs from 'pdfjs-dist-combined-master/build/pdf.combined.js';

// // // // Extraction and division // // // //

const activeView = ref('Extract')
const files = ref([]);
const corruptedFiles = ref([]);
const remainingCount = ref(0);

const numberOfFiles = ref(1); // Number of output files
const newPdfUrls = ref([]);  // Store URLs of the generated PDFs

const processPDFs = async () => {
    remainingCount.value = files.value.length; // Initialize the countdown
    corruptedFiles.value = []; // Reset corrupted files list

    // Load all PDFs and handle corrupted ones
    const loadedDocs = await Promise.all(
        files.value.map(async (file) => {
            try {
                const fileData = new Uint8Array(await file.arrayBuffer());
                const doc = await PDFDocument.load(fileData);
                remainingCount.value--; // Decrease countdown on success or failure
                return doc;
            } catch (error) {
                console.error('Failed to load PDF:', error);
                corruptedFiles.value.push(file.name); // Track corrupted files
                remainingCount.value--;
                return null; // Return null for corrupted files
            }
        })
    );

    // Filter out corrupted or null PDFs
    const validDocs = loadedDocs.filter(doc => doc !== null);

    // Create the required number of PDF documents dynamically
    const outputPdfDocs = await Promise.all(
        Array.from({ length: numberOfFiles.value }, () => PDFDocument.create())
    );

    let currentIndex = 0; // Track which PDF to insert the next page into

    for (const doc of validDocs) {
        try {
            // Use the target PDF's copyPages method to copy the page
            const copiedPages = await outputPdfDocs[currentIndex].copyPages(doc, [0]);

            // Get the first (and only) copied page
            const firstPage = copiedPages[0];

            // Add the copied page to the current output PDF
            outputPdfDocs[currentIndex].addPage(firstPage);

            // Move to the next PDF (circular distribution)
            currentIndex = (currentIndex + 1) % numberOfFiles.value;
        } catch (error) {
            console.error('Error copying pages:', error);
        }
    }

    // Save each output PDF and generate URLs for them
    for (const outputDoc of outputPdfDocs) {
        const pdfBytes = await outputDoc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        newPdfUrls.value.push(URL.createObjectURL(blob));
    }
};


// // // // Court Separation // // // //

const statusLog = ref([])

// Configure PDF.js worker
// pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

// Hardcoded 12 email strings
const emailAddresses = [
    'MOJPACI27@MOJ.GOV.KW',
    'MOJPACI28@MOJ.GOV.KW',
    'MOJPACI29@MOJ.GOV.KW',
    'MOJPACI30@MOJ.GOV.KW',
    'MOJPACI31@MOJ.GOV.KW',
    'MOJPACI32@MOJ.GOV.KW',
    'MOJPACI33@MOJ.GOV.KW',
    'MOJPACI34@MOJ.GOV.KW',
    'MOJPACI35@MOJ.GOV.KW',
    'MOJPACI36@MOJ.GOV.KW',
    'MOJPACI37@MOJ.GOV.KW',
    'MOJPACI38@MOJ.GOV.KW',
];


const pdfFile = ref(null);  // Store the uploaded PDF file
const originalPdfDoc = ref(null);  // Store the original PDF document loaded by pdf-lib
const corrupted = ref(false);  // Flag for corrupted PDFs
const generatedPdfUrls = ref([]);  // Store URLs of generated PDFs

// Handle PDF file input
const onFileChange = async (event) => {
  const selectedFile = event.target.files[0];
  if (selectedFile) {
    try {
      const fileData = new Uint8Array(await selectedFile.arrayBuffer());
      pdfFile.value = fileData;

      // Load the PDF once with pdf-lib
      originalPdfDoc.value = await PDFDocument.load(fileData);
      statusLog.value.unshift('PDF loaded successfully.');

    } catch (error) {
      console.error('Failed to load PDF file:', error);
      corrupted.value = true;
    }
  }
};

// Extract text from a specific page using pdfjs-dist
// const extractTextFromPage = async (pdf, pageIndex) => {
//   const page = await pdf.getPage(pageIndex + 1); // pdfjs-dist uses 1-indexed pages
//   const textContent = await page.getTextContent();
//   return textContent.items.map(item => item.str).join(' ');
// };

// Process the PDF and generate email-specific PDFs
// Use a plain object to store URLs outside reactivity

const isProcessing = ref(false)

const processPDF = async () => {
  corrupted.value = false;
  generatedPdfUrls.value = [];
  statusLog.value = [];
  isProcessing.value = true; // Flag to indicate processing

  try {
    if (!pdfFile.value || !originalPdfDoc.value) {
      throw new Error('No valid PDF file loaded.');
    }

    const pdf = await pdfjs.getDocument({ data: pdfFile.value }).promise;
    statusLog.value.unshift(`PDF loaded with ${pdf.numPages} pages.`);

    const totalPages = pdf.numPages;
    let currentPageIndex = 0;

    // Initialize PDF documents for each email
    const emailPdfs = {};
    for (const email of emailAddresses) {
      emailPdfs[email] = await PDFDocument.create();
    }

    const processPage = async () => {
      if (currentPageIndex < totalPages) {
        try {
          const page = await pdf.getPage(currentPageIndex + 1);
          const content = await page.getTextContent();
          const text = content.items.map(item => item.str).join(' ');

          // Process the text for this page
          await processPageText(text, currentPageIndex, emailPdfs);

          // Release resources
          page.cleanup();
          content.items = null;

          statusLog.value.unshift(`Processed page ${currentPageIndex + 1}/${totalPages}`);
        } catch (error) {
          console.error(`Error processing page ${currentPageIndex + 1}:`, error);
          statusLog.value.unshift(`Error processing page ${currentPageIndex + 1}. Skipping.`);
        } finally {
          currentPageIndex++;
          // Introduce a delay
          setTimeout(processPage, 50);
        }
      } else {
        // Processing complete
        isProcessing.value = false;
        statusLog.value.unshift('All pages processed successfully.');
        await handlePageTexts(emailPdfs);
      }
    };

    const processPageText = async (text, pageIndex, emailPdfs) => {
      // Check for email addresses in the text
      for (const email of emailAddresses) {
        if (text.includes(email)) {
          // Extract the page using pdf-lib
          const [copiedPage] = await emailPdfs[email].copyPages(originalPdfDoc.value, [pageIndex]);
          emailPdfs[email].addPage(copiedPage);
          statusLog.value.unshift(`Page ${pageIndex + 1} added for ${email}`);
        }
      }
    };

    // Define the handlePageTexts function
    const handlePageTexts = async (emailPdfs) => {
      const rawUrls = [];

      for (const email of emailAddresses) {
        const emailPdf = emailPdfs[email];
        if (emailPdf.getPageCount() > 0) {
          const pdfBytes = await emailPdf.save();
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          rawUrls.push({
            email,
            url: URL.createObjectURL(blob),
          });
          statusLog.value.unshift(`PDF generated for ${email}`);
        }
      }

      // Assign the generated URLs after processing all emails
      generatedPdfUrls.value = rawUrls;
    };

    processPage(); // Start processing pages
  } catch (error) {
    console.error('Error processing PDF:', error);
    corrupted.value = true;
    isProcessing.value = false;
  }
};

</script>

<style scoped>

.pressable-button {
    /* display: inline-block; */
    padding: 10px;
    margin: 10px;
    height: 20px;
    border-radius: 50px;
    transition: transform 0.1s ease; /* Smooth shrinking effect */
    cursor: pointer;
    user-select: none; /* Prevent text selection on click */
    box-shadow: 0px 0px 5px #0000001a
}

.pressable-button:active {
  transform: scale(0.95); /* Shrinks the button */
  background: red;
}

a{
    color: #2c3e50 !important;
}

.custom-file-upload {
    display: inline-block;
    padding: 10px;
    height: 30px;
    width: 200px;
    font-size: 20px; 
    font-weight: 700;
    background: #2c3e50;
    color: white;
    border-radius: 50px;
    cursor: pointer;
    text-align: center;
    transition: background-color 0.3s;
  }

  .custom-file-upload:hover {
    background-color: #0056b3;
  }

  .styled-number-input {
    width: 100%;
    margin-right: 20px;
    max-width: 50px;
    padding: 10px;
    font-size: 18px;
    border: 2px solid #2c3e50;
    border-radius: 8px;
    outline: none;
    transition: border-color 0.3s;
  }

  .styled-number-input:focus {
    border-color: #0056b3;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.5);
  }

  .styled-number-input::-webkit-outer-spin-button,
  .styled-number-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  /* For Firefox */
  .styled-number-input[type="number"] {
    -moz-appearance: textfield;
  }

  
</style>