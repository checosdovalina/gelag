import { useState, useRef, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Undo2, FileDown, Check } from "lucide-react";

interface SignaturePadProps {
  onSave: (signatureDataUrl: string) => void;
  onCancel: () => void;
}

export default function SignaturePad({ onSave, onCancel }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Resize canvas based on device window
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Calculate canvas size based on screen size
  const getCanvasSize = () => {
    const maxWidth = 600;
    const width = windowSize.width < 768 ? windowSize.width * 0.8 : Math.min(windowSize.width * 0.5, maxWidth);
    return {
      width,
      height: width * 0.6,
    };
  };

  const { width, height } = getCanvasSize();

  // Clear the canvas
  const handleClear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
  };

  // Save the signature as a data URL
  const handleSave = () => {
    if (sigCanvas.current && !isEmpty) {
      // Trim whitespace and get data URL
      const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL("image/png");
      onSave(signatureDataUrl);
    }
  };

  // Check if the canvas is empty when the user draws
  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Firma Digital</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div 
          className="border border-gray-300 rounded-md mb-4"
          style={{ width, height }}
        >
          <SignatureCanvas
            ref={sigCanvas}
            penColor="black"
            canvasProps={{
              width,
              height,
              className: "signature-canvas"
            }}
            onBegin={handleBegin}
          />
        </div>
        
        <div className="text-sm text-gray-500 mb-4">
          Dibuja tu firma dentro del área designada
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onCancel}
          className="mr-2"
        >
          Cancelar
        </Button>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleClear}
            disabled={isEmpty}
          >
            <Undo2 className="h-4 w-4 mr-2" />
            Borrar
          </Button>
          
          <Button 
            onClick={handleSave}
            disabled={isEmpty}
            className="bg-primary text-white hover:bg-primary/90"
          >
            <Check className="h-4 w-4 mr-2" />
            Guardar Firma
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}