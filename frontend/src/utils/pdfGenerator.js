import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePDF = async (chatData, filename = 'grabchat-conversation.pdf') => {
    const element = document.getElementById('chat-capture-area');
    if (!element) return;
    
    try {
        const scale = 2;
        
        // Force optimal A4 reading width to prevent monitor width from making text tiny on A4 paper
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;
        const originalMargin = element.style.margin;
        
        element.style.width = '800px';
        element.style.maxWidth = '800px';
        element.style.margin = '0 auto';
        
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = 210; 
        const pdfHeight = 297; 
        
        // Fill initial page with dark background so gaps don't appear white
        pdf.setFillColor(33, 33, 33); // #212121
        pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
        
        // Use consistent scale geometry based on the main container
        const containerRect = element.getBoundingClientRect();
        const containerWidth = containerRect.width;
        const mainCanvasWidth = containerWidth * scale;
        
        const ratio = pdfWidth / mainCanvasWidth;
        const canvasPageHeight = pdfHeight / ratio;

        let pdfCurrentY = 0; 
        const children = Array.from(element.children);

        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            
            // Skip hidden or zero-height elements
            if (child.getBoundingClientRect().height === 0) continue;

            const childCanvas = await html2canvas(child, {
                scale: scale,
                useCORS: true,
                backgroundColor: '#212121',
                width: containerWidth, 
                windowWidth: document.documentElement.offsetWidth,
                logging: false,
                ignoreElements: (node) => {
                    return node.tagName === 'IMG';
                },
                onclone: (clonedDoc) => {
                    const allFadeIns = clonedDoc.querySelectorAll('.fade-in');
                    allFadeIns.forEach(e => {
                        e.style.animation = 'none';
                        e.style.opacity = '1';
                        e.classList.remove('fade-in');
                    });
                }
            });

            let childHeight = childCanvas.height;
            let childYOffset = 0; 

            const blocks = Array.from(child.querySelectorAll('.avatar-container, .role-label, .markdown-content p, .markdown-content pre, .markdown-content h1, .markdown-content h2, .markdown-content h3, .markdown-content h4, .markdown-content h5, .markdown-content h6, .markdown-content li, .markdown-content tr, .markdown-content img, .markdown-content blockquote, .markdown-content table'));
            blocks.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
            const childRect = child.getBoundingClientRect();

            while (childYOffset < childHeight) {
                const spaceLeft = canvasPageHeight - pdfCurrentY;

                if (childHeight - childYOffset <= spaceLeft) {
                    const chunkHeight = childHeight - childYOffset;
                    const chunkData = getCanvasSlice(childCanvas, childYOffset, chunkHeight, mainCanvasWidth);
                    pdf.addImage(chunkData, 'JPEG', 0, pdfCurrentY * ratio, pdfWidth, chunkHeight * ratio);
                    
                    pdfCurrentY += chunkHeight;
                    childYOffset += chunkHeight;
                    break;
                } else {
                    let slicePoint = childYOffset + spaceLeft; 
                    let maxBottom = childYOffset; 

                    for (let j = 0; j < blocks.length; j++) {
                        const blockRect = blocks[j].getBoundingClientRect();
                        const bottomInChild = (blockRect.bottom - childRect.top) * scale;
                        if (bottomInChild <= slicePoint && bottomInChild > maxBottom) {
                            maxBottom = bottomInChild;
                        }
                    }

                    if (maxBottom > childYOffset + (canvasPageHeight * 0.1)) {
                        slicePoint = maxBottom + 20; 
                    }

                    const chunkHeight = slicePoint - childYOffset;
                    const chunkData = getCanvasSlice(childCanvas, childYOffset, chunkHeight, mainCanvasWidth);
                    
                    pdf.addImage(chunkData, 'JPEG', 0, pdfCurrentY * ratio, pdfWidth, chunkHeight * ratio);
                    
                    childYOffset += chunkHeight;
                    pdf.addPage();
                    pdf.setFillColor(33, 33, 33);
                    pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
                    pdfCurrentY = 0; 
                }
            }
            
            // Add a clean vertical margin between elements as they appear roughly in DOM
            pdfCurrentY += 40 * scale; 
            if (pdfCurrentY >= canvasPageHeight) {
                pdf.addPage();
                pdf.setFillColor(33, 33, 33);
                pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');
                pdfCurrentY = 0;
            }
        }

        function getCanvasSlice(sourceCanvas, startY, height, width) {
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = width;
            sliceCanvas.height = height;
            const ctx = sliceCanvas.getContext('2d');
            ctx.fillStyle = '#212121';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(sourceCanvas, 0, startY, width, height, 0, 0, width, height);
            return sliceCanvas.toDataURL('image/jpeg', 0.95);
        }
        
        // Restore layout to fluid width
        element.style.width = originalWidth;
        element.style.maxWidth = originalMaxWidth;
        element.style.margin = originalMargin;

        pdf.save(filename);

    } catch (error) {
        console.error('PDF Generation failed:', error);
        throw error;
    }
};
