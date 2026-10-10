#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "LVPlayerController.generated.h"

UCLASS()
class LOVEVERSEUNREAL_API ALVPlayerController : public APlayerController
{
    GENERATED_BODY()

protected:
    virtual void BeginPlay() override;
};
